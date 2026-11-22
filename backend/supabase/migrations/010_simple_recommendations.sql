-- Simple landmark recommendations from Questionnaire B. Run after 009. Safe to run again.
--
-- Fills in 007's hook, landmark_recommended_ids(profile_id), with transparent rules until the team's
-- real recommender replaces it (keep the signature; the map only reads this function):
--   * the person's exploration picks ("Famous landmarks", "Museums", "Nature & parks"…) from the
--     universal profile, plus the active trip's activities in Tourist mode;
--   * each pick maps to landmark categories (below);
--   * per pick, the most prominent places they haven't visited yet (for "Hidden gems", the least
--     prominent), about 40 in all; ties are broken by a per-person shuffle, so two people with the
--     same answers don't get exactly the same list;
--   * no answers yet: a handful of the island's major landmarks.
-- Recommendations only add a badge on the map. Every landmark stays visible.

create or replace function landmark_recommended_ids(p_profile_id uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  with rec as (
    select m.record from migo_profiles m where m.profile_id = p_profile_id
  ),
  picks as (
    select distinct pick from (
      select a as pick
        from rec,
             jsonb_array_elements_text(case when jsonb_typeof(rec.record #> '{universal,exploration,attractions}') = 'array'
                                            then rec.record #> '{universal,exploration,attractions}' else '[]' end) a
      union all
      select a
        from rec,
             jsonb_array_elements(case when jsonb_typeof(rec.record #> '{tourist,trips}') = 'array'
                                       then rec.record #> '{tourist,trips}' else '[]' end) t,
             jsonb_array_elements_text(case when jsonb_typeof(t -> 'activities') = 'array' then t -> 'activities' else '[]' end) a
       where rec.record ->> 'activeMode' = 'tourist'
         and t ->> 'id' = rec.record #>> '{tourist,activeTripId}'
    ) all_picks
  ),
  -- Questionnaire B "attractions" (frontend/src/features/profile/options.ts) → landmark categories.
  pick_categories (pick, category) as (
    values
      ('landmarks', 'landmark'), ('landmarks', 'architecture'), ('landmarks', 'religious'), ('landmarks', 'viewpoint'),
      ('hidden-gems', 'historic'), ('hidden-gems', 'public-art'), ('hidden-gems', 'park'), ('hidden-gems', 'architecture'),
      ('historical', 'historic'), ('historical', 'architecture'), ('historical', 'religious'),
      ('museums', 'museum'),
      ('nature', 'park'), ('nature', 'viewpoint'),
      ('food-spots', 'market'),
      ('shopping', 'market'),
      ('nightlife', 'culture'),
      ('sports', 'park'), ('sports', 'campus'),
      ('cultural', 'culture'), ('cultural', 'museum'),
      ('photo-spots', 'viewpoint'), ('photo-spots', 'public-art'), ('photo-spots', 'landmark')
  ),
  quota as (
    select greatest(5, 40 / greatest(count(*), 1))::int as per_pick from picks
  ),
  ranked as (
    select l.id,
           row_number() over (
             partition by p.pick
             order by case when p.pick = 'hidden-gems' then -l.prominence else l.prominence end,
                      md5(p_profile_id::text || l.id::text)) as rn
      from picks p
      join pick_categories pc on pc.pick = p.pick
      join landmarks l on l.category = pc.category and l.is_active
     where (p.pick <> 'landmarks' or l.prominence <= 2)
       and (p.pick <> 'hidden-gems' or l.prominence >= 3)
       and not exists (select 1 from landmark_discoveries d where d.profile_id = p_profile_id and d.landmark_id = l.id)
  )
  select distinct r.id from ranked r, quota q where r.rn <= q.per_pick
  union
  (select l.id
     from landmarks l
    where exists (select 1 from rec)
      and not exists (select 1 from picks)
      and l.is_active and l.prominence = 1
      and l.category in ('landmark', 'museum', 'viewpoint', 'religious')
    order by md5(p_profile_id::text || l.id::text)
    limit 15)
$$;

revoke execute on function landmark_recommended_ids(uuid) from public, anon, authenticated;
