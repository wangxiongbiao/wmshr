# Supabase Rebuild Runbook

## Current Project

- Supabase project: `wmshr`
- Project ref: `ptsmigtxbtruohvchskf`
- Organization: `wangxiongbiao's Org` (`gxdropeaghwnrgtvdlax`)
- Region: `us-west-2`
- Size: `nano`
- DB password is stored locally in macOS Keychain under service `wmshr-supabase-db-password-20260715`, account `wmshr`.

## Migration Model

- `supabase/migrations/20260715130000_current_schema_baseline.sql` is the empty-database baseline for the rebuilt project.
- Older incremental migrations are archived under `supabase/migrations_legacy_incremental/` and should not be pushed directly to a fresh project.
- The baseline intentionally creates only schema, constraints, indexes, RLS, comments, and service-role grants. It does not import demo data from `.codex-tmp`.

## Auth Configuration

- `site_url` remains `https://admin.dutylix.com`.
- Redirect allow-list covers production, local admin, and Google popup callback variants.
- Google OAuth credentials are injected through `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET`; never commit the real values.
- Google OAuth credentials are stored locally in macOS Keychain under services `wmshr-google-oauth-client-id-20260715` and `wmshr-google-oauth-client-secret-20260715`, account `wmshr`.
- Google Console must include this authorized redirect URI for the rebuilt project: `https://ptsmigtxbtruohvchskf.supabase.co/auth/v1/callback`.

## Verification Commands

```bash
DB_PASSWORD="$(security find-generic-password -a wmshr -s wmshr-supabase-db-password-20260715 -w)"
supabase db push --dry-run --linked --password "$DB_PASSWORD" --dns-resolver https
supabase db push --linked --password "$DB_PASSWORD" --dns-resolver https
supabase db lint --linked --schema public --fail-on error
```
