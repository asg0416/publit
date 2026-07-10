-- The application now writes an 8-character geohash bucket. It remains coarse
-- enough to avoid storing raw position data while keeping the 50m view close to
-- the visible radius. The existing check already permits the resulting 10-char
-- `g:` value; this index keeps expiry filtering on the nearby hot path.
create index if not exists flames_nearby_live_expires_idx
  on public.flames (geohash, expires_at, created_at)
  where status = 'live';
