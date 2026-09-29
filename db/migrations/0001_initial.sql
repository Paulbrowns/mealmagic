-- Feed Me / Cloudflare D1
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'My household',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  diner_type TEXT NOT NULL DEFAULT 'regular' CHECK (diner_type IN ('regular','occasional')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS food_preferences (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  meal_name TEXT NOT NULL,
  preference TEXT NOT NULL CHECK (preference IN ('like','favourite','dislike','never')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(person_id, meal_name)
);

CREATE TABLE IF NOT EXISTS menus (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(household_id, month_key)
);

CREATE TABLE IF NOT EXISTS menu_meals (
  id TEXT PRIMARY KEY,
  menu_id TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK(day_number BETWEEN 1 AND 31),
  meal_type TEXT NOT NULL CHECK(meal_type IN ('lunch','supper')),
  meal_name TEXT NOT NULL,
  is_split INTEGER NOT NULL DEFAULT 0,
  locked INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  UNIQUE(menu_id, day_number, meal_type)
);

CREATE TABLE IF NOT EXISTS meal_feedback (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  person_id TEXT REFERENCES people(id) ON DELETE CASCADE,
  meal_name TEXT NOT NULL,
  feedback TEXT NOT NULL CHECK(feedback IN ('love','keep','remove')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_people_household ON people(household_id);
CREATE INDEX IF NOT EXISTS idx_preferences_person ON food_preferences(person_id);
CREATE INDEX IF NOT EXISTS idx_menus_household ON menus(household_id);
CREATE INDEX IF NOT EXISTS idx_menu_meals_menu ON menu_meals(menu_id);
