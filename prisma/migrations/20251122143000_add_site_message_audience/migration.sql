DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'SiteMessageAudience'
  ) THEN
    CREATE TYPE "SiteMessageAudience" AS ENUM ('ALL', 'ADMIN_ONLY');
  END IF;
END
$$;

ALTER TABLE "site_messages"
  ADD COLUMN IF NOT EXISTS "audience" "SiteMessageAudience" NOT NULL DEFAULT 'ALL';
