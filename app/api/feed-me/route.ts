import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Preference = "like" | "favourite" | "dislike" | "never";

const HOUSEHOLD_COOKIE = "feed_me_household";
const SESSION_COOKIE = "feed_me_session";
const SESSION_DAYS = 30;

function bytesToHex(bytes: ArrayBuffer | Uint8Array) {
  return Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  return bytesToHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function hashPassword(password: string, saltHex?: string) {
  const salt = saltHex
    ? new Uint8Array((saltHex.match(/.{1,2}/g) || []).map((x) => parseInt(x, 16)))
    : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 150000 },
    key,
    256
  );
  return { hash: bytesToHex(bits), salt: bytesToHex(salt) };
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function randomToken() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

function readCookie(request: Request, name: string) {
  const header = request.headers.get("cookie") || "";
  const found = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(name + "="));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

async function resolveHousehold(database: any, request: Request) {
  const session = await getSession(database, request);
  const requestedId = readCookie(request, HOUSEHOLD_COOKIE);

  if (session) {
    if (requestedId) {
      const allowed = await database.prepare(
        "SELECT household_id FROM household_members WHERE household_id = ? AND user_id = ?"
      ).bind(requestedId, session.user_id).first();
      if (allowed) return { id: requestedId, isNew: false };
    }

    const membership = await database.prepare(
      "SELECT household_id FROM household_members WHERE user_id = ? ORDER BY created_at LIMIT 1"
    ).bind(session.user_id).first();
    if (membership?.household_id) return { id: String(membership.household_id), isNew: true };

    const id = crypto.randomUUID();
    await database.prepare(
      "INSERT INTO households (id, name) VALUES (?, 'My household')"
    ).bind(id).run();
    await database.prepare(
      "INSERT INTO household_members (household_id, user_id, role) VALUES (?, ?, 'owner')"
    ).bind(id, session.user_id).run();
    return { id, isNew: true };
  }

  let id = requestedId;
  let isNew = false;
  if (!id) {
    id = crypto.randomUUID();
    isNew = true;
  }
  await database.prepare(
    "INSERT OR IGNORE INTO households (id, name) VALUES (?, 'My household')"
  ).bind(id).run();
  return { id, isNew };
}

function withHouseholdCookie(response: NextResponse, householdId: string, setCookie: boolean) {
  if (setCookie) {
    response.cookies.set(HOUSEHOLD_COOKIE, householdId, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 60 * 60 * 24 * 365
    });
  }
  return response;
}

async function getSession(database: any, request: Request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const session = await database.prepare(
    `SELECT s.id, s.user_id, u.email, u.name
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP`
  ).bind(tokenHash).first();
  return session || null;
}

async function createSession(database: any, userId: string) {
  const token = randomToken();
  const tokenHash = await sha256(token);
  const id = crypto.randomUUID();
  await database.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at)
     VALUES (?, ?, ?, datetime('now', '+' || ? || ' days'))`
  ).bind(id, userId, tokenHash, SESSION_DAYS).run();
  return token;
}

function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 60 * 60 * 24 * SESSION_DAYS
  });
  return response;
}

async function db() {
  const { env } = getCloudflareContext();
  const database = (env as unknown as { DB?: any }).DB;
  if (!database) throw new Error("D1 binding DB is unavailable in this deployment.");
  return database;
}

async function ensureSchema(database: any) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS households (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'My household',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      diner_type TEXT NOT NULL DEFAULT 'regular' CHECK (diner_type IN ('regular','occasional')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS food_preferences (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      meal_name TEXT NOT NULL,
      preference TEXT NOT NULL CHECK (preference IN ('like','favourite','dislike','never')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(person_id, meal_name)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_people_household ON people(household_id)`,
    `CREATE INDEX IF NOT EXISTS idx_preferences_person ON food_preferences(person_id)`,
    `CREATE TABLE IF NOT EXISTS menus (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      month_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(household_id, month_key)
    )`,
    `CREATE TABLE IF NOT EXISTS menu_meals (
      id TEXT PRIMARY KEY,
      menu_id TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
      day_number INTEGER NOT NULL CHECK(day_number BETWEEN 1 AND 31),
      meal_type TEXT NOT NULL CHECK(meal_type IN ('lunch','supper')),
      meal_name TEXT NOT NULL,
      is_split INTEGER NOT NULL DEFAULT 0,
      locked INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      UNIQUE(menu_id, day_number, meal_type)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_menus_household ON menus(household_id)`,
    `CREATE INDEX IF NOT EXISTS idx_menu_meals_menu ON menu_meals(menu_id)`,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)`,
    `CREATE TABLE IF NOT EXISTS household_members (
      household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (household_id, user_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_household_members_user ON household_members(user_id)`,
    `CREATE TABLE IF NOT EXISTS household_invites (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      email TEXT,
      expires_at TEXT NOT NULL,
      accepted_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_household_invites_token ON household_invites(token_hash)`
  ];

  for (const sql of statements) {
    await database.prepare(sql).run();
  }
}

function normalise(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function monthKeyNow() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function daysInMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function rotate<T>(items: T[], offset: number) {
  if (!items.length) return items;
  const n = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(n), ...items.slice(0, n)];
}

function pickWithSpacing(pool: string[], index: number, recent: string[]) {
  if (!pool.length) return "Something easy from the Meal Bank";
  for (let step = 0; step < pool.length; step += 1) {
    const candidate = pool[(index + step) % pool.length];
    if (!recent.includes(normalise(candidate))) return candidate;
  }
  return pool[index % pool.length];
}

function mealLooksLunchy(meal: string) {
  const v = normalise(meal);
  return ["soup","sandwich","toast","toastie","croissant","salad","pâté","pate","baked potato","flatbread","quiche","eggs","egg","gazpacho","vichyssoise"].some((k) => v.includes(k));
}

function mealLooksSupper(meal: string) {
  const v = normalise(meal);
  return !["soup","sandwich","toastie","croissant","pâté","pate"].some((k) => v.includes(k));
}

async function getHouseholdData(database: any, householdId: string) {
  const peopleResult = await database.prepare(
    "SELECT id, name, diner_type FROM people WHERE household_id = ? ORDER BY created_at, name"
  ).bind(householdId).all();

  const prefsResult = await database.prepare(
    `SELECT fp.person_id, fp.meal_name, fp.preference
     FROM food_preferences fp
     JOIN people p ON p.id = fp.person_id
     WHERE p.household_id = ?
     ORDER BY fp.created_at, fp.meal_name`
  ).bind(householdId).all();

  const peopleRows = (peopleResult.results ?? []) as Array<{ id: string; name: string; diner_type: string }>;
  const prefRows = (prefsResult.results ?? []) as Array<{ person_id: string; meal_name: string; preference: Preference }>;

  const people = peopleRows.map((person) => {
    const prefs = prefRows.filter((p) => p.person_id === person.id);
    return {
      id: person.id,
      name: person.name,
      dinerType: person.diner_type,
      likes: prefs.filter((p) => p.preference === "like").map((p) => p.meal_name),
      favourites: prefs.filter((p) => p.preference === "favourite").map((p) => p.meal_name),
      dislikes: prefs.filter((p) => p.preference === "dislike").map((p) => p.meal_name),
      never: prefs.filter((p) => p.preference === "never").map((p) => p.meal_name)
    };
  });

  return { people, prefRows };
}

async function loadMenu(database: any, householdId: string, monthKey: string) {
  const menu = await database.prepare(
    "SELECT id, month_key FROM menus WHERE household_id = ? AND month_key = ?"
  ).bind(householdId, monthKey).first();

  if (!menu) return null;

  const mealsResult = await database.prepare(
    "SELECT day_number, meal_type, meal_name, is_split, locked, notes FROM menu_meals WHERE menu_id = ? ORDER BY day_number, meal_type"
  ).bind(menu.id).all();

  const days = Array.from({ length: daysInMonth(monthKey) }, (_, i) => ({ day: i + 1, lunch: "", supper: "", supperSplit: false }));
  for (const row of (mealsResult.results ?? []) as Array<{ day_number: number; meal_type: "lunch" | "supper"; meal_name: string; is_split: number }>) {
    const target = days[row.day_number - 1];
    if (!target) continue;
    if (row.meal_type === "lunch") target.lunch = row.meal_name;
    if (row.meal_type === "supper") {
      target.supper = row.meal_name;
      target.supperSplit = Boolean(row.is_split);
    }
  }
  return { id: menu.id, monthKey, days };
}

async function generateAndSaveMenu(database: any, householdId: string, monthKey: string) {
  const { people } = await getHouseholdData(database, householdId);
  const regulars = people.filter((p) => p.dinerType === "regular");
  const diners = regulars.length ? regulars : people;

  const blocked = new Set(
    diners.flatMap((p) => [...p.dislikes, ...p.never].map(normalise))
  );

  const positiveByPerson = diners.map((p) => ({
    ...p,
    positive: [...p.favourites, ...p.likes].filter((meal) => !blocked.has(normalise(meal)))
  }));

  const counts = new Map<string, { meal: string; count: number }>();
  for (const person of positiveByPerson) {
    for (const meal of person.positive) {
      const key = normalise(meal);
      const entry = counts.get(key) ?? { meal, count: 0 };
      entry.count += 1;
      counts.set(key, entry);
    }
  }

  const shared = [...counts.values()].filter((x) => x.count >= Math.min(2, diners.length)).map((x) => x.meal);
  const householdFavourites = [...new Set(positiveByPerson.flatMap((p) => p.favourites))]
    .filter((meal) => !blocked.has(normalise(meal)));
  const allPositive = [...new Set(positiveByPerson.flatMap((p) => p.positive))];

  const defaultLunches = [
    "Tomato soup & toast","French onion soup","Coronation chicken sandwiches","Ham & cheese toasties",
    "Smoked salmon & avocado","Carrot & coriander soup","Baked potato & cheese","Prawn & avocado salad",
    "Smoked mackerel pâté on toast","Quiche & salad"
  ];
  const lunchPool = [...new Set([
    ...shared.filter(mealLooksLunchy),
    ...allPositive.filter(mealLooksLunchy),
    ...defaultLunches
  ])].filter((meal) => !blocked.has(normalise(meal)));

  const supperPool = [...new Set([
    ...shared.filter(mealLooksSupper),
    ...householdFavourites.filter(mealLooksSupper),
    ...allPositive.filter(mealLooksSupper)
  ])].filter((meal) => !blocked.has(normalise(meal)));

  const splitPairs: string[] = [];
  if (positiveByPerson.length >= 2) {
    const first = positiveByPerson[0];
    const second = positiveByPerson[1];
    const firstOnly = first.favourites.filter((m) => !second.positive.some((x) => normalise(x) === normalise(m)));
    const secondOnly = second.favourites.filter((m) => !first.positive.some((x) => normalise(x) === normalise(m)));
    const splitCount = Math.min(4, firstOnly.length, secondOnly.length);
    for (let i = 0; i < splitCount; i += 1) {
      splitPairs.push(`${first.name}: ${firstOnly[i]} • ${second.name}: ${secondOnly[i]}`);
    }
  }

  const [year, month] = monthKey.split("-").map(Number);
  const offset = (year + month) % Math.max(1, supperPool.length);
  const rotatedSuppers = rotate(supperPool, offset);
  const rotatedLunches = rotate(lunchPool, month % Math.max(1, lunchPool.length));
  const totalDays = daysInMonth(monthKey);
  const days: Array<{ day: number; lunch: string; supper: string; supperSplit: boolean }> = [];
  const recentLunches: string[] = [];
  const recentSuppers: string[] = [];

  for (let day = 1; day <= totalDays; day += 1) {
    const lunch = pickWithSpacing(rotatedLunches, day - 1, recentLunches.slice(-4));
    let supperSplit = false;
    let supper = pickWithSpacing(rotatedSuppers, (day - 1) * 3, recentSuppers.slice(-6));

    if (splitPairs.length && [7, 14, 21, 28].includes(day)) {
      const pair = splitPairs[Math.floor(day / 7) - 1];
      if (pair) {
        supper = pair;
        supperSplit = true;
      }
    }

    recentLunches.push(normalise(lunch));
    recentSuppers.push(normalise(supper));
    days.push({ day, lunch, supper, supperSplit });
  }

  const existing = await database.prepare(
    "SELECT id FROM menus WHERE household_id = ? AND month_key = ?"
  ).bind(householdId, monthKey).first();

  const menuId = existing?.id ?? crypto.randomUUID();

  if (!existing) {
    await database.prepare(
      "INSERT INTO menus (id, household_id, month_key, status) VALUES (?, ?, ?, 'active')"
    ).bind(menuId, householdId, monthKey).run();
  } else {
    await database.prepare("DELETE FROM menu_meals WHERE menu_id = ?").bind(menuId).run();
  }

  const statements = days.flatMap((day) => [
    database.prepare(
      "INSERT INTO menu_meals (id, menu_id, day_number, meal_type, meal_name, is_split) VALUES (?, ?, ?, 'lunch', ?, 0)"
    ).bind(crypto.randomUUID(), menuId, day.day, day.lunch),
    database.prepare(
      "INSERT INTO menu_meals (id, menu_id, day_number, meal_type, meal_name, is_split) VALUES (?, ?, ?, 'supper', ?, ?)"
    ).bind(crypto.randomUUID(), menuId, day.day, day.supper, day.supperSplit ? 1 : 0)
  ]);
  if (statements.length) await database.batch(statements);

  return { id: menuId, monthKey, days };
}

export async function GET(request: Request) {
  try {
    const database = await db();
    await ensureSchema(database);
    const household = await resolveHousehold(database, request);

    const { people } = await getHouseholdData(database, household.id);
    const monthKey = monthKeyNow();
    const menu = await loadMenu(database, household.id, monthKey);
    const householdRow = await database.prepare("SELECT name FROM households WHERE id = ?").bind(household.id).first();

    const session = await getSession(database, request);
    const membership = session ? await database.prepare(
      "SELECT role FROM household_members WHERE household_id = ? AND user_id = ?"
    ).bind(household.id, session.user_id).first() : null;

    const response = NextResponse.json({
      household: { id: household.id, name: householdRow?.name || "My household" },
      people,
      menu,
      account: session ? { id: session.user_id, email: session.email, name: session.name, role: membership?.role || null } : null
    });
    return withHouseholdCookie(response, household.id, household.isNew);
  } catch (error) {
    console.error("feed-me GET", error);
    const detail = error instanceof Error ? `${error.message}${(error as Error & { cause?: { message?: string } }).cause?.message ? " — " + (error as Error & { cause?: { message?: string } }).cause?.message : ""}` : String(error);
    return NextResponse.json({ error: "Could not load Meal Bank.", detail }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const database = await db();
    await ensureSchema(database);
    const household = await resolveHousehold(database, request);
    const householdId = household.id;
    const body = await request.json();

    if (body?.action === "register") {
      const email = String(body.email || "").trim().toLowerCase();
      const name = String(body.name || "").trim();
      const password = String(body.password || "");
      if (!email || !name || password.length < 8) {
        return NextResponse.json({ error: "Name, valid email and a password of at least 8 characters are required." }, { status: 400 });
      }

      const exists = await database.prepare("SELECT id FROM users WHERE lower(email) = lower(?)").bind(email).first();
      if (exists) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });

      const userId = crypto.randomUUID();
      const passwordData = await hashPassword(password);
      await database.prepare(
        "INSERT INTO users (id, email, name, password_hash, password_salt) VALUES (?, ?, ?, ?, ?)"
      ).bind(userId, email, name, passwordData.hash, passwordData.salt).run();

      await database.prepare(
        "INSERT OR IGNORE INTO household_members (household_id, user_id, role) VALUES (?, ?, 'owner')"
      ).bind(householdId, userId).run();

      const token = await createSession(database, userId);
      const response = NextResponse.json({ ok: true, account: { id: userId, email, name, role: "owner" } });
      setSessionCookie(response, token);
      return withHouseholdCookie(response, householdId, household.isNew);
    }

    if (body?.action === "login") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const user = await database.prepare(
        "SELECT id, email, name, password_hash, password_salt FROM users WHERE lower(email) = lower(?)"
      ).bind(email).first();
      if (!user) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });

      const passwordData = await hashPassword(password, String(user.password_salt));
      if (!safeEqual(passwordData.hash, String(user.password_hash))) {
        return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
      }

      const membership = await database.prepare(
        "SELECT household_id, role FROM household_members WHERE user_id = ? ORDER BY created_at LIMIT 1"
      ).bind(user.id).first();
      if (!membership) return NextResponse.json({ error: "No household is linked to this account." }, { status: 409 });

      const token = await createSession(database, String(user.id));
      const response = NextResponse.json({
        ok: true,
        account: { id: user.id, email: user.email, name: user.name, role: membership.role },
        householdId: membership.household_id
      });
      setSessionCookie(response, token);
      return withHouseholdCookie(response, String(membership.household_id), true);
    }

    if (body?.action === "logout") {
      const token = readCookie(request, SESSION_COOKIE);
      if (token) {
        await database.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
      }
      const response = NextResponse.json({ ok: true });
      response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: true, maxAge: 0 });
      return response;
    }

    if (body?.action === "create-invite") {
      const session = await getSession(database, request);
      if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
      const membership = await database.prepare(
        "SELECT role FROM household_members WHERE household_id = ? AND user_id = ?"
      ).bind(householdId, session.user_id).first();
      if (!membership) return NextResponse.json({ error: "You are not a member of this household." }, { status: 403 });

      const inviteToken = randomToken();
      const inviteHash = await sha256(inviteToken);
      const inviteId = crypto.randomUUID();
      const email = String(body.email || "").trim().toLowerCase() || null;
      await database.prepare(
        `INSERT INTO household_invites (id, household_id, created_by, token_hash, email, expires_at)
         VALUES (?, ?, ?, ?, ?, datetime('now', '+7 days'))`
      ).bind(inviteId, householdId, session.user_id, inviteHash, email).run();
      return NextResponse.json({ ok: true, inviteToken });
    }

    if (body?.action === "accept-invite") {
      const session = await getSession(database, request);
      if (!session) return NextResponse.json({ error: "Sign in or create an account before joining." }, { status: 401 });
      const inviteToken = String(body.inviteToken || "");
      const invite = await database.prepare(
        `SELECT id, household_id, email FROM household_invites
         WHERE token_hash = ? AND accepted_at IS NULL AND expires_at > CURRENT_TIMESTAMP`
      ).bind(await sha256(inviteToken)).first();
      if (!invite) return NextResponse.json({ error: "This invite is invalid or has expired." }, { status: 404 });
      if (invite.email && String(invite.email).toLowerCase() !== String(session.email).toLowerCase()) {
        return NextResponse.json({ error: "This invite was sent to a different email address." }, { status: 403 });
      }

      await database.prepare(
        "INSERT OR IGNORE INTO household_members (household_id, user_id, role) VALUES (?, ?, 'member')"
      ).bind(invite.household_id, session.user_id).run();
      await database.prepare("UPDATE household_invites SET accepted_at = CURRENT_TIMESTAMP WHERE id = ?").bind(invite.id).run();

      const response = NextResponse.json({ ok: true, householdId: invite.household_id });
      return withHouseholdCookie(response, String(invite.household_id), true);
    }

    if (body?.action === "start-household") {
      const name = String(body.name || "").trim();
      const dinerType = body.dinerType === "occasional" ? "occasional" : "regular";
      if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

      // Always create a fresh household for first-run onboarding so we don't depend
      // on a cookie having been established by the initial GET request.
      const newHouseholdId = crypto.randomUUID();
      const personId = crypto.randomUUID();

      await database.prepare(
        "INSERT INTO households (id, name) VALUES (?, ?)"
      ).bind(newHouseholdId, name + "'s household").run();

      await database.prepare(
        "INSERT INTO people (id, household_id, name, diner_type) VALUES (?, ?, ?, ?)"
      ).bind(personId, newHouseholdId, name, dinerType).run();

      const response = NextResponse.json({
        ok: true,
        household: { id: newHouseholdId, name: name + "'s household" },
        person: { id: personId, name, dinerType }
      });
      return withHouseholdCookie(response, newHouseholdId, true);
    }

    if (body?.action === "preference") {
      const personId = String(body.personId || "");
      const mealName = String(body.mealName || "").trim();
      const preference = body.preference as Preference;
      const remove = Boolean(body.remove);

      if (!personId || !mealName || !["like","favourite","dislike","never"].includes(preference)) {
        return NextResponse.json({ error: "Invalid preference." }, { status: 400 });
      }

      if (remove) {
        await database.prepare(
          `DELETE FROM food_preferences
           WHERE person_id = ? AND lower(meal_name) = lower(?)
           AND person_id IN (SELECT id FROM people WHERE household_id = ?)`
        ).bind(personId, mealName, householdId).run();
      } else {
        const ownsPerson = await database.prepare(
          "SELECT id FROM people WHERE id = ? AND household_id = ?"
        ).bind(personId, householdId).first();
        if (!ownsPerson) return NextResponse.json({ error: "Person not found." }, { status: 404 });
        await database.prepare(
          `INSERT INTO food_preferences (id, person_id, meal_name, preference)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(person_id, meal_name) DO UPDATE SET preference = excluded.preference`
        ).bind(crypto.randomUUID(), personId, mealName, preference).run();
      }
      return withHouseholdCookie(NextResponse.json({ ok: true }), householdId, household.isNew);
    }

    if (body?.action === "generate-month") {
      const monthKey = typeof body.monthKey === "string" && /^\d{4}-\d{2}$/.test(body.monthKey)
        ? body.monthKey
        : monthKeyNow();
      const menu = await generateAndSaveMenu(database, householdId, monthKey);
      return withHouseholdCookie(NextResponse.json({ ok: true, menu }), householdId, household.isNew);
    }

    if (body?.action === "swap-meal") {
      const day = Number(body.day);
      const mealType = body.mealType === "supper" ? "supper" : "lunch";
      const monthKey = typeof body.monthKey === "string" && /^\d{4}-\d{2}$/.test(body.monthKey) ? body.monthKey : monthKeyNow();
      const menu = await database.prepare(
        "SELECT id FROM menus WHERE household_id = ? AND month_key = ?"
      ).bind(householdId, monthKey).first();
      if (!menu) return NextResponse.json({ error: "Menu not found." }, { status: 404 });

      const current = await database.prepare(
        "SELECT meal_name FROM menu_meals WHERE menu_id = ? AND day_number = ? AND meal_type = ?"
      ).bind(menu.id, day, mealType).first();
      if (!current) return NextResponse.json({ error: "Meal not found." }, { status: 404 });

      const { people } = await getHouseholdData(database, householdId);
      const regulars = people.filter((p) => p.dinerType === "regular");
      const diners = regulars.length ? regulars : people;
      const blocked = new Set(diners.flatMap((p) => [...p.dislikes, ...p.never].map(normalise)));
      const positives = [...new Set(diners.flatMap((p) => [...p.favourites, ...p.likes]))]
        .filter((meal) => !blocked.has(normalise(meal)));

      const lunchFallbacks = ["Tomato soup & toast","Coronation chicken sandwiches","Ham & cheese toasties","Baked potato & cheese","Quiche & salad"];
      const pool = mealType === "lunch"
        ? [...new Set([...positives.filter(mealLooksLunchy), ...lunchFallbacks])].filter((meal) => !blocked.has(normalise(meal)))
        : positives.filter(mealLooksSupper);

      const currentName = normalise(String(current.meal_name));
      const alternative = pool.find((meal) => normalise(meal) !== currentName) || current.meal_name;

      await database.prepare(
        "UPDATE menu_meals SET meal_name = ?, is_split = 0 WHERE menu_id = ? AND day_number = ? AND meal_type = ?"
      ).bind(alternative, menu.id, day, mealType).run();

      return withHouseholdCookie(NextResponse.json({ ok: true, mealName: alternative }), householdId, household.isNew);
    }

    if (body?.action === "delete-person") {
      const personId = String(body.personId || "");
      if (!personId) return NextResponse.json({ error: "Person is required." }, { status: 400 });

      const ownsPerson = await database.prepare(
        "SELECT id FROM people WHERE id = ? AND household_id = ?"
      ).bind(personId, householdId).first();
      if (!ownsPerson) return NextResponse.json({ error: "Person not found." }, { status: 404 });

      await database.prepare(
        "DELETE FROM people WHERE id = ? AND household_id = ?"
      ).bind(personId, householdId).run();

      return withHouseholdCookie(NextResponse.json({ ok: true }), householdId, household.isNew);
    }

    if (body?.action === "add-person") {
      const name = String(body.name || "").trim();
      const dinerType = body.dinerType === "occasional" ? "occasional" : "regular";
      if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
      const id = crypto.randomUUID();
      await database.prepare(
        "INSERT INTO people (id, household_id, name, diner_type) VALUES (?, ?, ?, ?)"
      ).bind(id, householdId, name, dinerType).run();
      const response = NextResponse.json({ ok: true, person: { id, name, dinerType } });
      return withHouseholdCookie(response, householdId, household.isNew);
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    console.error("feed-me POST", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Could not save Meal Bank.", detail }, { status: 500 });
  }
}
