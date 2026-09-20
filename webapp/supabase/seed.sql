-- Optional: seed the same demo properties the prototype used, so the
-- calendar isn't empty on first run. Safe to skip or edit.
insert into public.properties (name) values
  ('19A Chuculba Cres'),
  ('Suburban Haven'),
  ('Modern Guest House'),
  ('Cozy Container'),
  ('Giralang Unit 4'),
  ('The Riverside Loft'),
  ('Braddon Studio'),
  ('Kingston Foreshore 2BR'),
  ('Manuka Terrace'),
  ('Dickson Courtyard House'),
  ('Belconnen Lakeview'),
  ('Yarralumla Cottage')
on conflict do nothing;
