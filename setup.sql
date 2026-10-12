-- Таблицы для семинара «Расследование инцидента».
-- Выполнить один раз в Supabase: SQL Editor -> New query -> вставить -> Run.
-- Таблицы опроса (poll_state, votes) не затрагиваются.

create table if not exists inv_state (
  id int primary key,
  stage text not null default 'brief',
  inject1 boolean not null default false,
  inject2 boolean not null default false,
  screen text not null default 'board',
  timer_end timestamptz,
  updated_at timestamptz default now()
);
insert into inv_state (id) values (1) on conflict (id) do nothing;

create table if not exists inv_cards (
  id bigserial primary key,
  team int not null,
  day int not null,
  minutes int not null,
  what text not null,
  proof text,
  technique text,
  status text not null default 'new',
  created_at timestamptz default now()
);

create table if not exists inv_answers (
  id bigserial primary key,
  team int not null,
  kind text not null,
  body text,
  updated_at timestamptz default now(),
  unique (team, kind)
);

-- Доступ для страницы (как в опросе)
alter table inv_state enable row level security;
alter table inv_cards enable row level security;
alter table inv_answers enable row level security;

drop policy if exists inv_state_all on inv_state;
drop policy if exists inv_cards_all on inv_cards;
drop policy if exists inv_answers_all on inv_answers;
create policy inv_state_all on inv_state for all to anon, authenticated using (true) with check (true);
create policy inv_cards_all on inv_cards for all to anon, authenticated using (true) with check (true);
create policy inv_answers_all on inv_answers for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on inv_state, inv_cards, inv_answers to anon, authenticated;
grant usage, select on sequence inv_cards_id_seq, inv_answers_id_seq to anon, authenticated;
