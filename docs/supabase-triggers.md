# Supabase Triggers — Apply Manually

> Run these SQL statements in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
> Check off each trigger as you apply it.

---

## Balance Triggers

- [ ] **trg_job_party_balance** — fires on `jobs` INSERT/UPDATE/DELETE
  - Updates `parties.running_balance` (adds/removes job `amount`)
  - Updates `machines.current_meter_reading` (sets to `closing_reading`)

- [ ] **trg_party_advance_balance** — fires on `party_advances` INSERT
  - Decrements `parties.running_balance` by `amount`
  - Decrements `accounts.current_balance` by `amount`

- [ ] **trg_party_settlement_balance** — fires on `party_settlements` INSERT
  - Sets `parties.running_balance` to 0 (or remainder after writeoff)
  - Increments `accounts.current_balance` by `amount_received`

- [ ] **trg_salary_advance_balance** — fires on `salary_advances` INSERT
  - Increments `users.advance_balance` by `amount`
  - Decrements `accounts.current_balance` by `amount`

- [ ] **trg_staff_payment_balance** — fires on `staff_payments` INSERT
  - Reduces `users.advance_balance` by `advances_deducted`
  - Decrements `accounts.current_balance` by `net_paid`

- [ ] **trg_expense_account_balance** — fires on `expenses` INSERT
  - Decrements `accounts.current_balance` by `amount`

- [ ] **trg_emi_payment_balance** — fires on `emi_payments` INSERT
  - Increments `machine_emis.installments_paid` by 1
  - Sets `machine_emis.status` to `closed` if `installments_paid >= total_installments`
  - Decrements `accounts.current_balance` by `amount`

- [ ] **trg_oil_change_schedule** — fires on `oil_change_logs` INSERT
  - Updates `oil_change_schedules.last_changed_at_reading` to `reading_at_change`
  - Updates `oil_change_schedules.last_changed_date` to `date`

---

## Ledger Triggers

- [ ] **trg_ledger_job** — fires on `jobs` INSERT
  - Writes `ledger_entries` row: `type = job`, `entry_type = debit`, linked to `party_id` via `sites.party_id`

- [ ] **trg_ledger_expense** — fires on `expenses` INSERT
  - Writes `ledger_entries` row: `type = expense`, `entry_type = credit`, linked to `account_id`

- [ ] **trg_ledger_salary_advance** — fires on `salary_advances` INSERT
  - Writes `ledger_entries` row: `type = salary_advance`, `entry_type = credit`, linked to `staff_id`

- [ ] **trg_ledger_party_advance** — fires on `party_advances` INSERT
  - Writes `ledger_entries` row: `type = party_advance`, `entry_type = debit`, linked to `party_id`

- [ ] **trg_ledger_party_settlement** — fires on `party_settlements` INSERT
  - Writes `ledger_entries` row: `type = party_settlement`, `entry_type = debit`, linked to `party_id`
  - If `writeoff_amount > 0`: also writes second row `type = party_writeoff`

- [ ] **trg_ledger_staff_payment** — fires on `staff_payments` INSERT
  - Writes `ledger_entries` row: `type = staff_payment`, `entry_type = credit`, linked to `staff_id`

- [ ] **trg_ledger_emi_payment** — fires on `emi_payments` INSERT
  - Writes `ledger_entries` row: `type = emi_payment`, `entry_type = credit`, linked to `machine_id`

- [ ] **trg_ledger_oil_change** — fires on `oil_change_logs` INSERT
  - Writes `ledger_entries` row **only if** `cost IS NOT NULL AND cost > 0`
  - `type = oil_change`, `entry_type = credit`, linked to `machine_id` and `account_id`

---

## Utility Triggers

- [ ] **set_updated_at** — fires `BEFORE UPDATE` on every table that has an `updated_at` column
  - Tables: `users`, `businesses`, `machine_types`, `machines`, `machine_emis`, `oil_change_schedules`, `accounts`, `parties`, `sites`, `rate_cards`, `expense_categories`, `jobs`, `expenses`, `oil_change_logs`, `emi_payments`, `salary_advances`, `party_advances`, `party_settlements`, `staff_payments`
  - Sets `NEW.updated_at = NOW()`

  ```sql
  CREATE OR REPLACE FUNCTION fn_set_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  ```

- [ ] **write_audit_log** — fires `AFTER INSERT/UPDATE/DELETE` on every auditable table
  - Tables: `users`, `machines`, `machine_emis`, `accounts`, `parties`, `sites`, `rate_cards`, `jobs`, `expenses`, `emi_payments`, `salary_advances`, `party_advances`, `party_settlements`, `staff_payments`
  - Writes a row to `audit_logs` with `previous_data` (for UPDATE/DELETE) and `new_data` (for INSERT/UPDATE)

---

## Notes

- All trigger functions should use `SECURITY DEFINER` and be owned by the `postgres` role to bypass RLS.
- For `set_updated_at`, create a single function and attach it to all tables:
  ```sql
  CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON <table_name>
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
  ```
- Test each trigger by inserting a row via Supabase SQL editor and checking the affected balances.

---

## Phase 4 — Balance Updates (handled in Prisma transactions)

> **Implementation note:** The Phase 4 writes (salary advances, staff payments, party settlements) perform all balance mutations inside **Prisma interactive transactions** (`prisma.$transaction(async tx => …)`) rather than database-side triggers. This guarantees atomicity without requiring Supabase trigger setup.
>
> The SQL equivalents below are provided for reference if you ever want to migrate to trigger-based updates.

### Salary Advance (`salary_advances` INSERT)

```sql
-- Equivalent Supabase trigger (reference only — not required)
CREATE OR REPLACE FUNCTION fn_salary_advance_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Deduct from account
  UPDATE accounts
  SET current_balance = current_balance - NEW.amount,
      updated_at = NOW()
  WHERE id = NEW.account_id;

  -- Increment staff advance balance
  UPDATE users
  SET advance_balance = advance_balance + NEW.amount,
      updated_at = NOW()
  WHERE id = NEW.staff_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_salary_advance_balance
AFTER INSERT ON salary_advances
FOR EACH ROW EXECUTE FUNCTION fn_salary_advance_balance();
```

### Staff Payment (`staff_payments` INSERT)

```sql
CREATE OR REPLACE FUNCTION fn_staff_payment_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Deduct net paid from account
  UPDATE accounts
  SET current_balance = current_balance - NEW.net_paid,
      updated_at = NOW()
  WHERE id = NEW.account_id;

  -- Reduce advance balance by advances_deducted (floor at 0)
  UPDATE users
  SET advance_balance = GREATEST(0, advance_balance - COALESCE(NEW.advances_deducted, 0)),
      updated_at = NOW()
  WHERE id = NEW.staff_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_staff_payment_balance
AFTER INSERT ON staff_payments
FOR EACH ROW EXECUTE FUNCTION fn_staff_payment_balance();
```

### Party Settlement (`party_settlements` INSERT)

```sql
CREATE OR REPLACE FUNCTION fn_party_settlement_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Reduce party running_balance by amount_received + writeoff_amount
  UPDATE parties
  SET running_balance = running_balance
                        - NEW.amount_received
                        - COALESCE(NEW.writeoff_amount, 0),
      updated_at = NOW()
  WHERE id = NEW.party_id;

  -- Credit account with the cash received
  IF NEW.amount_received > 0 THEN
    UPDATE accounts
    SET current_balance = current_balance + NEW.amount_received,
        updated_at = NOW()
    WHERE id = NEW.account_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_party_settlement_balance
AFTER INSERT ON party_settlements
FOR EACH ROW EXECUTE FUNCTION fn_party_settlement_balance();
```

### Ledger Entries (Phase 4)

Phase 4 API routes also write `ledger_entries` rows directly inside the same Prisma transaction:

| Source table       | `type`              | `entry_type` | Key link         |
|--------------------|---------------------|--------------|------------------|
| `salary_advances`  | `salary_advance`    | `debit`      | `staff_id`       |
| `staff_payments`   | `staff_payment`     | `debit`      | `staff_id`       |
| `party_settlements`| `party_settlement`  | `credit`     | `party_id`       |
| `party_settlements`| `party_writeoff`    | `credit`     | `party_id`       |

> If you add trigger-based ledger writes later, **disable** the application-level writes in the API routes first to avoid duplicate entries.
