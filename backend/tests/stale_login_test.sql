-- Checks that a token for a deleted login gets a clear error (28000), not a foreign-key error,
-- and that real and anonymous sign-ups still work. Rolls back.
begin;
do $$
declare
  ghost uuid := '0fffffff-0000-4000-8000-00000000dead';
  real_user uuid := '0fffffff-0000-4000-8000-00000000beef';
  ok boolean := false;
  acct jsonb;
begin
  -- Deleted login: the token's user isn't in auth.users.
  perform set_config('request.jwt.claims', json_build_object('sub', ghost, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', ghost::text, true);
  begin
    perform migo_create_account('Ghost', 'star');
  exception when sqlstate '28000' then ok := true;
  end;
  if not ok then raise exception 'deleted login should get errcode 28000'; end if;

  -- A real login still works.
  insert into auth.users (id, email) values (real_user, 'real@example.com');
  perform set_config('request.jwt.claims', json_build_object('sub', real_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', real_user::text, true);
  acct := migo_create_account('Real', 'star');
  if not exists (select 1 from profiles where id = (acct ->> 'id')::uuid and auth_user_id = real_user) then
    raise exception 'real login should create a linked profile';
  end if;

  -- No login (device accounts) still works.
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  acct := migo_create_account('Anon', 'star');
  if acct ->> 'id' is null then raise exception 'anonymous create should still work'; end if;

  raise notice 'All stale-login checks passed';
end $$;
rollback;
