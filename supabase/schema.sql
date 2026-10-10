-- Group Pay Supabase Database Schema

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  wallet_address text unique not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists feed_items (
  id bigint generated always as identity primary key,
  group_id bigint not null,
  kind text not null,
  actor text,
  payload jsonb not null default '{}',
  tx_hash text not null,
  log_index int not null,
  created_at timestamptz default now(),
  unique (tx_hash, log_index)
);

create table if not exists comments (
  id bigint generated always as identity primary key,
  feed_item_id bigint references feed_items(id) on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz default now()
);

create table if not exists sync_state (
  id int primary key default 1,
  last_block bigint not null default 0
);

-- Initialize sync_state singleton
insert into sync_state (id, last_block)
values (1, 0)
on conflict (id) do nothing;
