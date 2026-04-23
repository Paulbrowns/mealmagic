create extension if not exists pgcrypto;

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  name text not null,
  use_leftovers boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  name text not null,
  age_group text not null,
  diet text not null default 'None',
  allergies text[] not null default '{}',
  cuisines text[] not null default '{}',
  loves text[] not null default '{}',
  hates text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  meal_type text not null,
  cuisine text not null default 'British',
  image_url text not null default '',
  prep_time integer not null default 0,
  cook_time integer not null default 0,
  serves integer not null default 4,
  tags text[] not null default '{}',
  allergens text[] not null default '{}',
  ingredients text[] not null default '{}',
  method text[] not null default '{}',
  note text not null default '',
  source_type text not null default 'manual',
  created_at timestamptz not null default now()
);

create table if not exists weekly_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  week_start date not null,
  created_at timestamptz not null default now(),
  unique (household_id, week_start)
);

create table if not exists weekly_plan_meals (
  id uuid primary key default gen_random_uuid(),
  weekly_plan_id uuid not null references weekly_plans(id) on delete cascade,
  day_name text not null,
  meal_type text not null,
  recipe_id uuid references recipes(id) on delete set null,
  unique (weekly_plan_id, day_name, meal_type)
);

create table if not exists recipe_feedback (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  rating text not null check (rating in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  unique (household_id, recipe_id)
);

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);
