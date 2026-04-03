alter table zh_chars
  add column hint         text,
  add column components   jsonb,
  add column trad_variant text;
