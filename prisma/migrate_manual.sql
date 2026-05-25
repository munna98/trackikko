DROP INDEX IF EXISTS "rate_cards_machine_id_party_id_site_id_mode_effective_from_key";
ALTER TABLE "rate_cards" DROP COLUMN IF EXISTS "effective_from";
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "batha" DECIMAL NOT NULL DEFAULT 0;
ALTER TABLE "users" DROP COLUMN IF EXISTS "default_batha";
ALTER TABLE "users" DROP COLUMN IF EXISTS "salary";
CREATE UNIQUE INDEX IF NOT EXISTS "rate_cards_machine_id_party_id_site_id_mode_key" ON "rate_cards"("machine_id", "party_id", "site_id", "mode");
