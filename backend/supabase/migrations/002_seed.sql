-- Demo data: the McGill hunts, a waiting pool of partners, and leaderboard teams.
-- Same content as frontend/src/lib/mockData.ts. Safe to run more than once.
-- Coordinates are approximate: verify each in Google Maps before the demo.

insert into hunts (id, title, photo, lat, lng, time_limit_sec, base_points, difficulty, reveal_text) values
  ('roddick-gates', 'Roddick Gates', '/assets/hunts/roddick-gates.jpg', 45.5048, -73.5772, 600, 100, 'easy',
   'These are the Roddick Gates, McGill''s main entrance on Sherbrooke Street, built in 1925 in memory of Sir Thomas Roddick.'),
  ('three-bares', 'The Three Bares (McGill campus)', '/assets/hunts/three-bares.jpg', 45.5045, -73.5780, 600, 150, 'medium',
   'This fountain sculpture on lower campus has been nicknamed "The Three Bares" by generations of McGill students.'),
  ('leonard-cohen-mural', 'Leonard Cohen mural', '/assets/hunts/leonard-cohen-mural.jpg', 45.4986, -73.5783, 900, 200, 'medium',
   'This giant portrait of Montreal-born poet and singer Leonard Cohen towers over Crescent Street, many storeys tall.'),
  ('kondiaronk', 'Kondiaronk Belvedere', '/assets/hunts/kondiaronk.jpg', 45.5040, -73.5874, 1500, 300, 'hard',
   'The Kondiaronk Belvedere on Mount Royal is named after the Wendat chief who helped bring about the Great Peace of Montreal in 1701.'),
  ('place-des-arts', 'Place des Arts fountains', '/assets/hunts/place-des-arts.jpg', 45.5085, -73.5665, 900, 200, 'medium',
   'Place des Arts is the heart of the Quartier des spectacles, Montreal''s festival district, and its fountains are a summer favourite.'),
  ('cartier-monument', 'George-Étienne Cartier Monument', '/assets/hunts/cartier-monument.jpg', 45.5144, -73.5866, 1200, 250, 'hard',
   'The Cartier Monument at the foot of Mount Royal is home to the Sunday Tam-Tams, the city''s famous open-air drum circle.')
on conflict (id) do update set
  title = excluded.title, photo = excluded.photo, lat = excluded.lat, lng = excluded.lng,
  time_limit_sec = excluded.time_limit_sec, base_points = excluded.base_points,
  difficulty = excluded.difficulty, reveal_text = excluded.reveal_text;

-- Dog park and accessibility hunts: add real, verified places like this.
-- insert into hunts (id, title, photo, lat, lng, time_limit_sec, base_points, difficulty, reveal_text, kind, accessible_for)
-- values ('some-dog-park', 'Some dog park', '/assets/hunts/some-dog-park.jpg', 45.0, -73.0, 900, 200, 'medium',
--         'Trivia shown after it''s found.', 'dog-park', '{}');
--
-- To mark an existing hunt as suitable for a need (after checking it really is):
-- update hunts set accessible_for = '{mobility}' where id = '...';

-- Partner pool: 3 tourists and 3 locals already waiting, so the demo always finds a match.
-- Each can be matched once. Run this file again to put them back in the queue.
insert into profiles (id, name, avatar, role, fun_fact, looking_since) values
  ('00000000-0000-4000-8000-000000000001', 'Ana',     '🦜', 'tourist', 'Flew in from Lisbon and has never seen snow.',           now()),
  ('00000000-0000-4000-8000-000000000002', 'Kenji',   '🐙', 'tourist', 'Collects a postcard from every city he visits.',         now()),
  ('00000000-0000-4000-8000-000000000003', 'Priya',   '🦒', 'tourist', 'Is here for one weekend and wants to see everything.',   now()),
  ('00000000-0000-4000-8000-000000000004', 'Marc',    '🦫', 'local',   'Knows every bagel shop in Mile End by smell.',           now()),
  ('00000000-0000-4000-8000-000000000005', 'Sophie',  '🐿️', 'local',   'Has climbed Mount Royal more than 200 times.',           now()),
  ('00000000-0000-4000-8000-000000000006', 'Yasmine', '🦔', 'local',   'Plays drums at the Tam-Tams most Sundays.',              now())
on conflict (id) do nothing;

delete from team_members where profile_id in (
  '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000006');
update profiles set looking_since = now() where id in (
  '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000006');

-- Leaderboard teams (with starting points so the board isn't empty).
insert into profiles (id, name, avatar, role) values
  ('00000000-0000-4000-9000-000000000001', 'Léa',     '🥯', 'local'),
  ('00000000-0000-4000-9000-000000000002', 'Tom',     '🐻', 'tourist'),
  ('00000000-0000-4000-9000-000000000003', 'Olivier', '🦆', 'local'),
  ('00000000-0000-4000-9000-000000000004', 'Mia',     '🐨', 'tourist'),
  ('00000000-0000-4000-9000-000000000005', 'Camille', '🐐', 'local'),
  ('00000000-0000-4000-9000-000000000006', 'Diego',   '🦩', 'tourist'),
  ('00000000-0000-4000-9000-000000000007', 'Nadia',   '🍄', 'local'),
  ('00000000-0000-4000-9000-000000000008', 'Sam',     '🐢', 'tourist'),
  ('00000000-0000-4000-9000-000000000009', 'Félix',   '🍁', 'local'),
  ('00000000-0000-4000-9000-000000000010', 'Hana',    '🐧', 'tourist')
on conflict (id) do nothing;

insert into teams (id, name, seed_points) values
  ('00000000-0000-4000-a000-000000000001', 'Bagel Bandits',   820),
  ('00000000-0000-4000-a000-000000000002', 'Poutine Patrol',  610),
  ('00000000-0000-4000-a000-000000000003', 'Mountain Goats',  455),
  ('00000000-0000-4000-a000-000000000004', 'Metro Gnomes',    240),
  ('00000000-0000-4000-a000-000000000005', 'Maple Mavericks', 130)
on conflict (id) do nothing;

insert into team_members (team_id, profile_id) values
  ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-9000-000000000001'),
  ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-9000-000000000002'),
  ('00000000-0000-4000-a000-000000000002', '00000000-0000-4000-9000-000000000003'),
  ('00000000-0000-4000-a000-000000000002', '00000000-0000-4000-9000-000000000004'),
  ('00000000-0000-4000-a000-000000000003', '00000000-0000-4000-9000-000000000005'),
  ('00000000-0000-4000-a000-000000000003', '00000000-0000-4000-9000-000000000006'),
  ('00000000-0000-4000-a000-000000000004', '00000000-0000-4000-9000-000000000007'),
  ('00000000-0000-4000-a000-000000000004', '00000000-0000-4000-9000-000000000008'),
  ('00000000-0000-4000-a000-000000000005', '00000000-0000-4000-9000-000000000009'),
  ('00000000-0000-4000-a000-000000000005', '00000000-0000-4000-9000-000000000010')
on conflict do nothing;
