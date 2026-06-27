# Security

## Non-Negotiables

- No 지도 API or map SDK.
- No raw lat/lng, raw latitude, raw longitude, raw coordinates, or raw_location persistence.
- No raw coordinate response fields.
- No Supabase service role key in browser code, tracked files, `NEXT_PUBLIC_*`, logs, docs, or chat.
- No exact user, reaction, report, or view counts in client responses.
- No Supabase Auth authorization logic in MVP.

## Supabase

- Public tables have RLS enabled.
- Public client direct table access is revoked.
- Mutations go through Edge Functions.
- Service role use is server-only inside Edge Functions.
- Security and performance advisors are part of `npm run harness:verify`.

## Abuse Controls

- Device id is generated locally and sent only as a SHA-256 `deviceHash`.
- Live slot limit is three active live flames per deviceHash.
- Create/react/report/extinguish actions are rate-limited.
- Duplicate reactions and reports are constrained by DB unique indexes.
- Blocked content is filtered before insert or suggestion response.
