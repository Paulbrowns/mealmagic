import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Preference = "like" | "favourite" | "dislike" | "never";

const HOUSEHOLD_ID = "default-household";

const seedPeople = [
  {
    id: "paul",
    name: "Paul",
    dinerType: "regular",
    likes: [
      "Open crab sandwiches","Crab","Chicken ciabatta subs","Frittata","Courgette","Lamb kofta","Greek meatballs",
      "Sea bass","Sea bream","Cod","Scallops","Aubergine Parmigiana","Parma ham","Wagyu burgers","Cheese soufflé",
      "Braised celery","Foie gras","Chicken livers","Lamb kidneys","Cheese fondue","Schnitzel","Ham and leek pie",
      "Smoked salmon","Avocado","Gravlax","Sweetbreads","Coronation chicken","Cheese","Blue cheese","Tuna tataki",
      "Gammon steak","Lasagne","Raclette","Tomato soup","Minestrone","Gazpacho","Vichyssoise","French onion soup",
      "Fish soup","Fish chowder","Garbure","Artichoke","Smoked mackerel","Haddock","Kedgeree","Lobster",
      "Lancashire hotpot","Onion tart","Tarte Tatin","Oxtail","Cannellini beans","Eggs and bacon","Pheasant",
      "Partridge","Quail","Pork belly","Suckling pig","Osso buco","Salt beef","Tongue","Quiche","Roast potatoes",
      "Spinach timbales","Steak tartare","Pâté","Avocado and prawns","Sole meunière","Moules marinières",
      "Bouillabaisse","Coq au vin","Beef bourguignon","Duck confit","Chicken Milanese","Veal saltimbocca","Moussaka",
      "Stuffed courgettes","Gratin dauphinois","Cauliflower cheese","Leek tart","Crab cakes","Lobster thermidor",
      "Prawn cocktail","Smoked haddock fishcakes","Beef carpaccio","Croque monsieur","Welsh rarebit","Roast chicken"
    ],
    favourites: ["Steak and chips","Lobster linguine","Lancashire hotpot","Osso buco"]
  },
  {
    id: "dee",
    name: "Dee",
    dinerType: "regular",
    likes: [
      "Toasted corn salad","Coronation chicken","Carbonara","Chinese takeaway","Smoked mackerel pâté",
      "Prawn and chorizo linguine","Chicken wings with Greek dip","Toasted ham and cheese","Croissant",
      "Lemon chicken skewers with couscous","Chickpea and pomegranate salad","Mexican chicken rice","Black bean salad",
      "Honey soy chicken and rice","Tomato and basil pasta salad","Thai beef salad","Marinated prawn salad",
      "Chicken and lentil bake","Lamb chops","Trout and pea linguine","Asparagus risotto","Nasi goreng",
      "Red pepper and tomato soup","Smoked salmon flatbread","Poached salmon","Salmon orzo","Salmon with samphire",
      "Salmon with pak choi","Chicken and ham pie","French onion soup","Chinese duck pancakes","Prawn salad",
      "Carrot and coriander soup","Courgette and basil soup","Creamy leeks","Baked potato",
      "Steak and chips with peppercorn sauce","Steak noodles","Salmon and red pepper rice","Salmon with tabbouleh",
      "Lasagne","Roast beef","Roast pork","Roast lamb","Spring chicken casserole","Fish and chips","Raclette",
      "Chicken crown with lentil salad","Poached egg on toast","Onion tarte tatin","Thai green curry",
      "Chicken burger with lettuce slaw","Chicken shawarma","Thai fish cakes with rice","Chicken burrito bowl",
      "Steak burrito","Crab"
    ],
    favourites: ["Steak and chips","Roast lamb","Chicken and ham pie","Salmon with tabbouleh"]
  }
] as const;

async function db() {
  const { env } = getCloudflareContext();
  return (env as unknown as { DB: D1Database }).DB;
}

async function ensureSchema(database: D1Database) {
  await database.exec(`
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
    CREATE INDEX IF NOT EXISTS idx_people_household ON people(household_id);
    CREATE INDEX IF NOT EXISTS idx_preferences_person ON food_preferences(person_id);
  `);
}

async function seed(database: D1Database) {
  const household = await database.prepare("SELECT id FROM households WHERE id = ?").bind(HOUSEHOLD_ID).first();
  if (household) return;

  await database.prepare("INSERT INTO households (id, name) VALUES (?, ?)").bind(HOUSEHOLD_ID, "Paul + Dee").run();

  for (const person of seedPeople) {
    await database.prepare("INSERT OR IGNORE INTO people (id, household_id, name, diner_type) VALUES (?, ?, ?, ?)")
      .bind(person.id, HOUSEHOLD_ID, person.name, person.dinerType).run();

    const statements = [
      ...person.likes.map((meal) => database.prepare(
        "INSERT OR IGNORE INTO food_preferences (id, person_id, meal_name, preference) VALUES (?, ?, ?, ?)"
      ).bind(crypto.randomUUID(), person.id, meal, "like")),
      ...person.favourites.map((meal) => database.prepare(
        "INSERT OR IGNORE INTO food_preferences (id, person_id, meal_name, preference) VALUES (?, ?, ?, ?)"
      ).bind(crypto.randomUUID(), person.id, meal, "favourite"))
    ];
    if (statements.length) await database.batch(statements);
  }
}

export async function GET() {
  try {
    const database = await db();
    await ensureSchema(database);
    await seed(database);

    const peopleResult = await database.prepare(
      "SELECT id, name, diner_type FROM people WHERE household_id = ? ORDER BY created_at, name"
    ).bind(HOUSEHOLD_ID).all<{ id: string; name: string; diner_type: string }>();

    const prefsResult = await database.prepare(
      `SELECT fp.person_id, fp.meal_name, fp.preference
       FROM food_preferences fp
       JOIN people p ON p.id = fp.person_id
       WHERE p.household_id = ?
       ORDER BY fp.created_at, fp.meal_name`
    ).bind(HOUSEHOLD_ID).all<{ person_id: string; meal_name: string; preference: Preference }>();

    const people = (peopleResult.results ?? []).map((person) => {
      const prefs = (prefsResult.results ?? []).filter((p) => p.person_id === person.id);
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

    return NextResponse.json({ household: { id: HOUSEHOLD_ID, name: "Paul + Dee" }, people });
  } catch (error) {
    console.error("feed-me GET", error);
    return NextResponse.json({ error: "Could not load Meal Bank." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const database = await db();
    await ensureSchema(database);
    const body = await request.json();

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
          "DELETE FROM food_preferences WHERE person_id = ? AND lower(meal_name) = lower(?)"
        ).bind(personId, mealName).run();
      } else {
        await database.prepare(
          `INSERT INTO food_preferences (id, person_id, meal_name, preference)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(person_id, meal_name) DO UPDATE SET preference = excluded.preference`
        ).bind(crypto.randomUUID(), personId, mealName, preference).run();
      }
      return NextResponse.json({ ok: true });
    }

    if (body?.action === "add-person") {
      const name = String(body.name || "").trim();
      const dinerType = body.dinerType === "occasional" ? "occasional" : "regular";
      if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
      const id = crypto.randomUUID();
      await database.prepare(
        "INSERT INTO people (id, household_id, name, diner_type) VALUES (?, ?, ?, ?)"
      ).bind(id, HOUSEHOLD_ID, name, dinerType).run();
      return NextResponse.json({ ok: true, person: { id, name, dinerType } });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    console.error("feed-me POST", error);
    return NextResponse.json({ error: "Could not save Meal Bank." }, { status: 500 });
  }
}
