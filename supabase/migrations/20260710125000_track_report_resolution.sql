alter table public.reports
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_action text
    check (review_action is null or review_action in ('keep', 'hide', 'delete'));

create index if not exists reports_reviewed_at_idx
  on public.reports (reviewed_at, created_at desc);
