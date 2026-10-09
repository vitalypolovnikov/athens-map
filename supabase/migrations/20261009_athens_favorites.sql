-- Applied to Supabase Athens Markets on 2026-10-09.
-- Included for reproducibility; do not run twice on the same project without
-- adapting CREATE statements.
create table public.athens_favorite_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 initialized_at timestamptz not null default now()
);
create table public.athens_favorite_items (
 user_id uuid not null references auth.users(id) on delete cascade,
 market_key text not null check (market_key ~ '^(bio:[0-9a-f]{32}|regular:[0-9]{1,10})$'),
 selected boolean not null,
 updated_at timestamptz not null default now(),
 primary key(user_id, market_key)
);
create function public.athens_favorite_items_touch()
returns trigger language plpgsql set search_path='' as $$
begin new.updated_at:=now();return new; end $$;
create trigger athens_favorite_items_touch
before insert or update on public.athens_favorite_items
for each row execute function public.athens_favorite_items_touch();
alter table public.athens_favorite_profiles enable row level security;
alter table public.athens_favorite_items enable row level security;
create policy "Own profile only" on public.athens_favorite_profiles
 for all to authenticated using ((select auth.uid())=user_id)
 with check ((select auth.uid())=user_id);
create policy "Own favorites only" on public.athens_favorite_items
 for all to authenticated using ((select auth.uid())=user_id)
 with check ((select auth.uid())=user_id);
revoke all on public.athens_favorite_profiles,public.athens_favorite_items from public,anon;
grant select,insert,update on public.athens_favorite_profiles,public.athens_favorite_items to authenticated;
create function public.athens_initialize_favorites(seed_keys text[])
returns boolean language plpgsql security invoker set search_path='' as $$
declare profile_created boolean; current_uid uuid;
begin
 current_uid:=(select auth.uid());
 if current_uid is null then raise exception 'Authentication required' using errcode='28000';end if;
 if coalesce(array_length(seed_keys,1),0)>500 then raise exception 'Too many favorites';end if;
 if exists (select 1 from unnest(coalesce(seed_keys,array[]::text[])) as key
   where key is null or key !~ '^(bio:[0-9a-f]{32}|regular:[0-9]{1,10})$')
 then raise exception 'Invalid favorite id';end if;
 insert into public.athens_favorite_profiles (user_id) values(current_uid)
 on conflict (user_id) do nothing;
 get diagnostics profile_created = row_count;
 if profile_created then
  insert into public.athens_favorite_items (user_id,market_key,selected)
   select current_uid,key,true
   from (select distinct key from unnest(coalesce(seed_keys,array[]::text[])) as key) seeds;
 end if;
 return profile_created;
end $$;
revoke all on function public.athens_initialize_favorites(text[]) from public,anon;
grant execute on function public.athens_initialize_favorites(text[]) to authenticated;
alter publication supabase_realtime add table public.athens_favorite_items;
