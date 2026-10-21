create function public.test_concurrent_delay() returns trigger language plpgsql as $$
begin
  perform pg_sleep(2);
  return new;
end $$;
create trigger test_concurrent_delay before insert on public.tss_submissions
for each row execute function public.test_concurrent_delay();
