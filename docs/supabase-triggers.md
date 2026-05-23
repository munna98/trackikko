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
