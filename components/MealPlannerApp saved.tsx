"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  Heart,
  NotebookPen,
  Pencil,
  Plus,
  RefreshCw,
  Share2,
  ShoppingCart,
  Sparkles,
  ThumbsDown,
  Trash2,
  Users,
  X,
} from "lucide-react";

type MealType = "Breakfast" | "Lunch" | "Dinner";
type BillingPlan = "monthly" | "yearly";
type ShoppingCategory =
  | "Produce"
  | "Dairy & Eggs"
  | "Meat & Fish"
  | "Bakery"
  | "Dry Goods"
  | "Tins & Jarred Goods"
  | "Herbs, Spices & Oils"
  | "Frozen"
  | "Other";

type Recipe = {
  id: string;
  title: string;
  mealType: MealType;
  description: string;
  image: string;
  prepTime: number;
  cookTime: number;
  serves: number;
  cuisine: string;
  tags: string[];
  allergens: string[];
  ingredients: string[];
  method: string[];
  note: string;
};

type Member = {
  id: string;
  name: string;
  ageGroup: string;
  dietTypes: string[];
  allergies: string[];
  cuisines: string[];
};

type Planner = Record<string, Record<MealType, string>>;

type MemberForm = {
  name: string;
  ageGroup: string;
  dietTypes: string[];
  allergies: string[];
  cuisines: string[];
};

type RecipeForm = {
  title: string;
  description: string;
  mealType: MealType;
  cuisine: string;
  ingredients: string;
  method: string;
};

type SponsoredProduct = {
  id: string;
  brand: string;
  product: string;
  context: string;
  match: string;
  image: string;
};

type BillingProfile = {
  trial_started_at: string | null;
  trial_ends_at: string | null;
};

type SubscriptionRow = {
  status: string | null;
  interval: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
};

type ShoppingGroup = {
  category: ShoppingCategory;
  items: string[];
  sponsoredProduct?: SponsoredProduct;
};

type ShoppingSelectionMap = Record<string, boolean>;

export function buildShoppingList(planner: Planner, recipeMap: Record<string, Recipe>): string[] {
  const uniqueItems = new Map<string, string>();

  Object.values(planner).forEach((dayMeals) => {
    Object.values(dayMeals).forEach((recipeId) => {
      const recipe = recipeMap[recipeId];
      if (!recipe) return;

      recipe.ingredients.forEach((ingredient) => {
        const cleaned = cleanShoppingIngredient(ingredient);
        if (!cleaned) return;

        const key = cleaned.toLowerCase();
        if (!uniqueItems.has(key)) {
          uniqueItems.set(key, cleaned);
        }
      });
    });
  });

  return [...uniqueItems.values()].sort((a, b) => a.localeCompare(b));
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner"];
const SHOPPING_CATEGORY_ORDER: ShoppingCategory[] = [
  "Produce",
  "Dairy & Eggs",
  "Meat & Fish",
  "Bakery",
  "Dry Goods",
  "Tins & Jarred Goods",
  "Herbs, Spices & Oils",
  "Frozen",
  "Other",
];

const AGE_GROUP_OPTIONS = ["Toddler", "Child", "Teenager", "Adult"];
const DIET_TYPE_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Pescatarian",
  "Low-fat",
  "High-protein",
  "Gluten-free",
  "Dairy-free",
  "Low-carb",
  "Mediterranean",
];
const ALLERGY_OPTIONS = ["Nuts", "Dairy", "Eggs", "Shellfish", "Sesame", "Soy", "Wheat", "Gluten"];
const CUISINE_OPTIONS = [
  "British",
  "French",
  "Italian",
  "Japanese",
  "Indian",
  "Mexican",
  "Chinese",
  "Thai",
  "Mediterranean",
  "American",
];

const TRIAL_DAYS_TOTAL = 21;
const FALLBACK_RECIPE_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";
const RECIPE_IMAGE_BUCKET = "recipe-images";

const SPONSORED_PRODUCTS: SponsoredProduct[] = [
  {
    id: "sp1",
    brand: "Filippo Berio",
    product: "Extra Virgin Olive Oil",
    context: "Suggested for Mediterranean cooking and dressings.",
    match: "Mediterranean meals",
    image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "sp2",
    brand: "Yeo Valley",
    product: "Greek Style Natural Yogurt",
    context: "Works well for breakfast bowls, sauces, and marinades.",
    match: "Breakfast and lunch recipes",
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "sp3",
    brand: "Old El Paso",
    product: "Soft Flour Tortilla Wraps",
    context: "Useful when wraps or quick lunch builds appear in the weekly plan.",
    match: "Lunch planning",
    image: "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=800&q=80",
  },
];

const RECIPES: Recipe[] = [
  {
    id: "1",
    title: "Berry Yoghurt Bowls",
    mealType: "Breakfast",
    description: "Quick breakfast bowls with berries, oats and yoghurt.",
    image: "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=1200&q=80",
    prepTime: 10,
    cookTime: 0,
    serves: 4,
    cuisine: "British",
    tags: ["Vegetarian", "Quick"],
    allergens: ["Dairy"],
    ingredients: ["500g Greek yoghurt", "200g mixed berries", "80g oats"],
    method: ["Divide yoghurt into bowls.", "Top with berries and oats.", "Serve immediately."],
    note: "",
  },
  {
    id: "2",
    title: "Chicken Wrap Lunch Box",
    mealType: "Lunch",
    description: "Packed lunch wraps with chicken, lettuce and yoghurt dressing.",
    image: "https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?auto=format&fit=crop&w=1200&q=80",
    prepTime: 12,
    cookTime: 0,
    serves: 4,
    cuisine: "British",
    tags: ["High-protein"],
    allergens: ["Wheat", "Dairy"],
    ingredients: ["4 wraps", "250g cooked chicken", "1 cucumber", "4 tbsp yoghurt"],
    method: ["Mix dressing.", "Fill wraps.", "Wrap and chill."],
    note: "",
  },
  {
    id: "3",
    title: "Creamy Mushroom Pasta",
    mealType: "Dinner",
    description: "Comforting weeknight pasta with garlic mushrooms and spinach.",
    image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=1200&q=80",
    prepTime: 15,
    cookTime: 20,
    serves: 4,
    cuisine: "Italian-inspired",
    tags: ["Vegetarian", "Family-friendly"],
    allergens: ["Dairy", "Wheat"],
    ingredients: ["300g pasta", "250g mushrooms", "2 garlic cloves", "150ml cream"],
    method: ["Cook pasta.", "Fry mushrooms and garlic.", "Stir in cream.", "Combine and season."],
    note: "",
  },
];

const INITIAL_PLANNER: Planner = {
  Monday: { Breakfast: "1", Lunch: "2", Dinner: "3" },
  Tuesday: { Breakfast: "1", Lunch: "2", Dinner: "3" },
  Wednesday: { Breakfast: "1", Lunch: "2", Dinner: "3" },
  Thursday: { Breakfast: "1", Lunch: "2", Dinner: "3" },
  Friday: { Breakfast: "1", Lunch: "2", Dinner: "3" },
  Saturday: { Breakfast: "1", Lunch: "2", Dinner: "3" },
  Sunday: { Breakfast: "1", Lunch: "2", Dinner: "3" },
};

const EMPTY_MEMBER_FORM: MemberForm = {
  name: "",
  ageGroup: "Adult",
  dietTypes: [],
  allergies: [],
  cuisines: [],
};

const EMPTY_RECIPE_FORM: RecipeForm = {
  title: "",
  description: "",
  mealType: "Dinner",
  cuisine: "British",
  ingredients: "",
  method: "",
};

async function loadRecipesFromSupabase(): Promise<Recipe[] | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("recipes")
    .select(
      "id, title, description, meal_type, image_url, prep_time, cook_time, serves, cuisine, tags, allergens, ingredients, method, note, approved_for_planning"
    )
    .eq("approved_for_planning", true)
    .order("created_at", { ascending: false });

  if (error || !data) return null;

  return data.map((row: any) => ({
    id: row.id,
    title: row.title,
    mealType: row.meal_type as MealType,
    description: row.description ?? "",
    image: row.image_url || FALLBACK_RECIPE_IMAGE,
    prepTime: row.prep_time ?? 0,
    cookTime: row.cook_time ?? 0,
    serves: row.serves ?? 4,
    cuisine: row.cuisine ?? "British",
    tags: row.tags ?? [],
    allergens: row.allergens ?? [],
    ingredients: row.ingredients ?? [],
    method: row.method ?? [],
    note: row.note ?? "",
  }));
}

async function loadMembersFromSupabase(householdId: string): Promise<Member[] | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("household_members")
    .select("id, name, age_group, diet_types, allergies, cuisines")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });

  if (error || !data) return null;

  return data.map((row: any) => ({
    id: row.id,
    name: row.name,
    ageGroup: row.age_group,
    dietTypes: row.diet_types ?? [],
    allergies: row.allergies ?? [],
    cuisines: row.cuisines ?? [],
  }));
}

async function loadPlannerFromSupabase(householdId: string, weekStart: string): Promise<Planner | null> {
  if (!supabase) return null;

  const { data: planRows, error: planError } = await supabase
    .from("weekly_plans")
    .select("id")
    .eq("household_id", householdId)
    .eq("week_start", weekStart)
    .limit(1);

  if (planError || !planRows || planRows.length === 0) return null;

  const weeklyPlanId = planRows[0].id;

  const { data: meals, error: mealsError } = await supabase
    .from("weekly_plan_meals")
    .select("day_name, meal_type, recipe_id")
    .eq("weekly_plan_id", weeklyPlanId);

  if (mealsError || !meals) return null;

  const planner: Planner = JSON.parse(JSON.stringify(INITIAL_PLANNER));
  let foundAny = false;

  for (const meal of meals) {
    const day = meal.day_name as keyof Planner;
    const type = meal.meal_type as MealType;
    if (planner[day] && type && meal.recipe_id) {
      planner[day][type] = meal.recipe_id;
      foundAny = true;
    }
  }

  return foundAny ? planner : null;
}

async function loadBillingProfileFromSupabase(userId: string): Promise<BillingProfile | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("billing_profiles")
    .select("trial_started_at, trial_ends_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("loadBillingProfileFromSupabase error:", error);
    return null;
  }

  return data ?? null;
}

async function loadSubscriptionFromSupabase(userId: string): Promise<SubscriptionRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("subscriptions")
    .select("status, interval, current_period_end, cancel_at_period_end")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("loadSubscriptionFromSupabase error:", error);
    return null;
  }

  return data ?? null;
}

async function ensureHousehold(userId: string): Promise<string | null> {
  if (!supabase) return null;

  const { data: existing, error: existingError } = await supabase
    .from("households")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (existingError) {
    console.error("ensureHousehold select error:", existingError);
    return null;
  }

  if (existing && existing.length > 0) return existing[0].id;

  const { data: inserted, error: insertError } = await supabase
    .from("households")
    .insert({ name: "My household", use_leftovers: true, owner_id: userId })
    .select("id")
    .limit(1);

  if (insertError) {
    console.error("ensureHousehold insert error:", insertError);
    return null;
  }

  if (!inserted || inserted.length === 0) return null;
  return inserted[0].id;
}

async function savePlannerToSupabase(householdId: string, weekStart: string, planner: Planner): Promise<void> {
  if (!supabase) return;

  const { data: planRows, error: planError } = await supabase
    .from("weekly_plans")
    .upsert({ household_id: householdId, week_start: weekStart }, { onConflict: "household_id,week_start" })
    .select("id")
    .limit(1);

  if (planError || !planRows || planRows.length === 0) return;

  const weeklyPlanId = planRows[0].id;

  const rows = DAYS.flatMap((day) =>
    MEAL_TYPES.map((mealType) => ({
      weekly_plan_id: weeklyPlanId,
      day_name: day,
      meal_type: mealType,
      recipe_id: planner[day][mealType],
    }))
  );

  await supabase.from("weekly_plan_meals").upsert(rows, {
    onConflict: "weekly_plan_id,day_name,meal_type",
  });
}

async function insertRecipeToSupabase(recipe: Recipe, userId: string): Promise<void> {
  if (!supabase) return;

  await supabase.from("recipes").insert({
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    meal_type: recipe.mealType,
    image_url: recipe.image,
    prep_time: recipe.prepTime,
    cook_time: recipe.cookTime,
    serves: recipe.serves,
    cuisine: recipe.cuisine,
    tags: recipe.tags,
    allergens: recipe.allergens,
    ingredients: recipe.ingredients,
    method: recipe.method,
    note: recipe.note,
    source_type: "manual",
    recipe_status: "approved",
    approved_for_planning: true,
    created_by: userId,
  });
}

async function insertMemberToSupabase(member: Member, householdId: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from("household_members").insert({
    id: member.id,
    name: member.name,
    age_group: member.ageGroup,
    diet_types: member.dietTypes,
    allergies: member.allergies,
    cuisines: member.cuisines,
    household_id: householdId,
  });

  if (error) console.error("insertMemberToSupabase error:", error);
}

async function updateMemberInSupabase(member: Member, householdId: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from("household_members")
    .update({
      name: member.name,
      age_group: member.ageGroup,
      diet_types: member.dietTypes,
      allergies: member.allergies,
      cuisines: member.cuisines,
      household_id: householdId,
    })
    .eq("id", member.id);

  if (error) console.error("updateMemberInSupabase error:", error);
}

async function deleteMemberFromSupabase(memberId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("household_members").delete().eq("id", memberId);
  if (error) console.error("deleteMemberFromSupabase error:", error);
}

async function updateRecipeNoteInSupabase(recipeId: string, note: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("recipes").update({ note }).eq("id", recipeId);
}

async function updateRecipeImageInSupabase(recipeId: string, imageUrl: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("recipes").update({ image_url: imageUrl }).eq("id", recipeId);
  if (error) console.error("updateRecipeImageInSupabase error:", error);
}

async function loadShoppingSelectionsFromSupabase(
  householdId: string,
  weekStart: string
): Promise<ShoppingSelectionMap> {
  if (!supabase) return {};

  const { data, error } = await supabase
    .from("shopping_list_selections")
    .select("selection_key, is_selected")
    .eq("household_id", householdId)
    .eq("week_start", weekStart);

  if (error || !data) {
    console.error("loadShoppingSelectionsFromSupabase error:", error);
    return {};
  }

  return Object.fromEntries(data.map((row: any) => [row.selection_key as string, Boolean(row.is_selected)]));
}

async function saveShoppingSelectionToSupabase(
  householdId: string,
  weekStart: string,
  selectionKey: string,
  isSelected: boolean
): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from("shopping_list_selections").upsert(
    {
      household_id: householdId,
      week_start: weekStart,
      selection_key: selectionKey,
      is_selected: isSelected,
    },
    { onConflict: "household_id,week_start,selection_key" }
  );

  if (error) {
    console.error("saveShoppingSelectionToSupabase error:", error);
  }
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now());
}

function getWeekStartISO(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function getWeekDateRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function diffDaysCeil(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function isActiveSubscriptionStatus(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function stripIngredientQuantity(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/^\d+\s*x\s*/i, "")
    .replace(/^\d+(?:\.\d+)?\s*(g|kg|ml|l)\s+/i, "")
    .replace(/^\d+(?:\.\d+)?\s*(tbsp|tsp|tablespoons?|teaspoons?|cups?)\s+/i, "")
    .replace(/^\d+\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanShoppingIngredient(raw: string): string {
  const value = stripIngredientQuantity(raw);

  if (!value) return "";

  if (value.includes("yoghurt") || value.includes("yogurt")) return "Greek yoghurt";
  if (value.includes("mixed berries") || value.includes("berries") || value.includes("berry")) return "Berries";
  if (value.includes("oats")) return "Oats";
  if (value.includes("wrap") || value.includes("tortilla")) return "Wraps";
  if (value.includes("chicken")) return "Chicken";
  if (value.includes("cucumber")) return "Cucumber";
  if (value.includes("mushroom")) return "Mushrooms";
  if (value.includes("garlic")) return "Garlic";
  if (value.includes("pasta")) return "Pasta";
  if (value.includes("cream")) return "Cream";
  if (value.includes("milk")) return "Milk";
  if (value.includes("cheese")) return "Cheese";
  if (value.includes("egg")) return "Eggs";
  if (value.includes("rice")) return "Rice";
  if (value.includes("bread")) return "Bread";
  if (value.includes("butter")) return "Butter";
  if (value.includes("olive oil")) return "Olive oil";

  return toTitleCase(value);
}

function normaliseItem(item: string): string {
  return item.toLowerCase().trim();
}

function getShoppingCategory(item: string): ShoppingCategory {
  const value = normaliseItem(item);

  if (
    value.includes("berry") ||
    value.includes("berries") ||
    value.includes("banana") ||
    value.includes("apple") ||
    value.includes("tomato") ||
    value.includes("cucumber") ||
    value.includes("mushroom") ||
    value.includes("garlic") ||
    value.includes("onion") ||
    value.includes("spinach") ||
    value.includes("lettuce") ||
    value.includes("pepper") ||
    value.includes("carrot") ||
    value.includes("potato") ||
    value.includes("lemon") ||
    value.includes("lime")
  ) {
    return "Produce";
  }

  if (
    value.includes("yoghurt") ||
    value.includes("yogurt") ||
    value.includes("milk") ||
    value.includes("cream") ||
    value.includes("butter") ||
    value.includes("cheese") ||
    value.includes("egg")
  ) {
    return "Dairy & Eggs";
  }

  if (
    value.includes("chicken") ||
    value.includes("beef") ||
    value.includes("pork") ||
    value.includes("turkey") ||
    value.includes("salmon") ||
    value.includes("fish") ||
    value.includes("prawn") ||
    value.includes("tuna")
  ) {
    return "Meat & Fish";
  }

  if (
    value.includes("wrap") ||
    value.includes("bread") ||
    value.includes("bagel") ||
    value.includes("bun") ||
    value.includes("roll") ||
    value.includes("tortilla") ||
    value.includes("pitta")
  ) {
    return "Bakery";
  }

  if (
    value.includes("pasta") ||
    value.includes("rice") ||
    value.includes("oats") ||
    value.includes("flour") ||
    value.includes("noodle") ||
    value.includes("couscous") ||
    value.includes("quinoa") ||
    value.includes("lentil") ||
    value.includes("bean") ||
    value.includes("chickpea")
  ) {
    return "Dry Goods";
  }

  if (
    value.includes("tin") ||
    value.includes("tinned") ||
    value.includes("jar") ||
    value.includes("passata") ||
    value.includes("tomato sauce") ||
    value.includes("pesto") ||
    value.includes("stock")
  ) {
    return "Tins & Jarred Goods";
  }

  if (
    value.includes("olive oil") ||
    value.includes("oil") ||
    value.includes("salt") ||
    value.includes("pepper") ||
    value.includes("paprika") ||
    value.includes("cumin") ||
    value.includes("oregano") ||
    value.includes("basil") ||
    value.includes("spice") ||
    value.includes("vinegar")
  ) {
    return "Herbs, Spices & Oils";
  }

  if (value.includes("frozen")) {
    return "Frozen";
  }

  return "Other";
}

function getSponsoredCategory(product: SponsoredProduct): ShoppingCategory {
  const value = `${product.product} ${product.context} ${product.match}`.toLowerCase();

  if (value.includes("oil")) return "Herbs, Spices & Oils";
  if (value.includes("yogurt") || value.includes("yoghurt")) return "Dairy & Eggs";
  if (value.includes("wrap") || value.includes("tortilla")) return "Bakery";

  return "Other";
}

function buildShoppingGroups(items: string[], sponsoredProducts: SponsoredProduct[]): ShoppingGroup[] {
  const grouped = new Map<ShoppingCategory, string[]>();

  for (const item of items) {
    const category = getShoppingCategory(item);
    const existing = grouped.get(category) ?? [];
    existing.push(item);
    grouped.set(category, existing);
  }

  const sponsoredByCategory = new Map<ShoppingCategory, SponsoredProduct>();
  for (const product of sponsoredProducts) {
    const category = getSponsoredCategory(product);
    if (!sponsoredByCategory.has(category)) {
      sponsoredByCategory.set(category, product);
    }
  }

  return SHOPPING_CATEGORY_ORDER
    .map((category) => ({
      category,
      items: grouped.get(category) ?? [],
      sponsoredProduct: sponsoredByCategory.get(category),
    }))
    .filter((group) => group.items.length > 0 || group.sponsoredProduct);
}

function makeShoppingSelectionKey(value: string): string {
  return value.trim().toLowerCase();
}

function makeSponsoredSelectionKey(productId: string): string {
  return `sponsored:${productId}`;
}

function badgeStyle(bg: string, color: string): React.CSSProperties {
  return {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    background: bg,
    color,
    fontSize: 12,
    fontWeight: 600,
  };
}

function cardStyle(): React.CSSProperties {
  return {
    background: "rgba(255,255,255,0.9)",
    border: "1px solid #fed7aa",
    borderRadius: 24,
    padding: 20,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  };
}

function getMemberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "HM";
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uploadRecipeImage(file: File, userId: string, fileNameHint?: string): Promise<string | null> {
  if (!supabase) return null;

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const baseName = fileNameHint || file.name.replace(/\.[^/.]+$/, "");
  const safeBaseName = slugify(baseName) || "recipe-image";
  const filePath = `${userId}/${Date.now()}-${safeBaseName}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(RECIPE_IMAGE_BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (uploadError) {
    console.error("uploadRecipeImage error:", uploadError);
    return null;
  }

  const { data } = supabase.storage.from(RECIPE_IMAGE_BUCKET).getPublicUrl(filePath);
  return data?.publicUrl ?? null;
}

async function uploadRemoteImageToStorage(
  imageUrl: string,
  userId: string,
  fileNameHint: string
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const blob = await response.blob();
    const mimeType = blob.type || "image/jpeg";

    let extension = "jpg";
    if (mimeType.includes("png")) extension = "png";
    else if (mimeType.includes("webp")) extension = "webp";
    else if (mimeType.includes("gif")) extension = "gif";

    const file = new File([blob], `${slugify(fileNameHint) || "recipe-image"}.${extension}`, {
      type: mimeType,
    });

    return await uploadRecipeImage(file, userId, fileNameHint);
  } catch (error) {
    console.error("uploadRemoteImageToStorage error:", error);
    return null;
  }
}

export default function App() {
  const authSupabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [freshRecipeIds, setFreshRecipeIds] = useState<string[]>([]);
  const [refreshingImageId, setRefreshingImageId] = useState<string | null>(null);
  const [uploadingRecipeImageId, setUploadingRecipeImageId] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState(1280);

  const [isLoadingData, setIsLoadingData] = useState(Boolean(supabase));
  const [dataSourceLabel] = useState(supabase ? "Supabase" : "Mock data");
  const [tab, setTab] = useState("planner");
  const [recipes, setRecipes] = useState<Recipe[]>(RECIPES);
  const [planner, setPlanner] = useState<Planner>(INITIAL_PLANNER);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberForm, setMemberForm] = useState<MemberForm>(EMPTY_MEMBER_FORM);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, "like" | "dislike" | null>>({});
  const [useLeftovers, setUseLeftovers] = useState(true);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [isSavingPlanner, setIsSavingPlanner] = useState(false);
  const [isGeneratingPlanner, setIsGeneratingPlanner] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingProfile, setBillingProfile] = useState<BillingProfile | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [shoppingSelections, setShoppingSelections] = useState<ShoppingSelectionMap>({});
  const [recipeForm, setRecipeForm] = useState<RecipeForm>(EMPTY_RECIPE_FORM);

  const [recipeImageFile, setRecipeImageFile] = useState<File | null>(null);
  const [recipeImagePreview, setRecipeImagePreview] = useState<string>("");
  const [generatedRecipeImageUrl, setGeneratedRecipeImageUrl] = useState<string>("");
  const [isGeneratingRecipeImage, setIsGeneratingRecipeImage] = useState(false);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const [recipeImageError, setRecipeImageError] = useState<string | null>(null);
  const [selectedRecipeImageError, setSelectedRecipeImageError] = useState<string | null>(null);

  const weekStart = useMemo(() => getWeekStartISO(), []);
  const weekDateRange = useMemo(() => getWeekDateRange(weekStart), [weekStart]);

  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1100;

  useEffect(() => {
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const { data } = await authSupabase.auth.getUser();
      if (!mounted) return;
      setUserId(data.user?.id ?? null);
      setUserEmail(data.user?.email ?? null);
      setUserCreatedAt(data.user?.created_at ?? null);
      setAuthLoading(false);
    }

    void loadUser();

    const {
      data: { subscription },
    } = authSupabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setUserEmail(session?.user?.email ?? null);
      setUserCreatedAt(session?.user?.created_at ?? null);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [authSupabase]);

  useEffect(() => {
    let isMounted = true;

    async function boot() {
      if (!supabase || !userId) {
        setIsLoadingData(false);
        return;
      }

      setIsLoadingData(true);

      const ensuredHouseholdId = await ensureHousehold(userId);
      if (!isMounted) return;
      setHouseholdId(ensuredHouseholdId);

      const [
        remoteRecipes,
        remoteMembers,
        remotePlanner,
        remoteBillingProfile,
        remoteSubscription,
        remoteShoppingSelections,
      ] = await Promise.all([
        loadRecipesFromSupabase(),
        ensuredHouseholdId ? loadMembersFromSupabase(ensuredHouseholdId) : Promise.resolve(null),
        ensuredHouseholdId ? loadPlannerFromSupabase(ensuredHouseholdId, weekStart) : Promise.resolve(null),
        loadBillingProfileFromSupabase(userId),
        loadSubscriptionFromSupabase(userId),
        ensuredHouseholdId ? loadShoppingSelectionsFromSupabase(ensuredHouseholdId, weekStart) : Promise.resolve({}),
      ]);

      if (!isMounted) return;

      setBillingProfile(remoteBillingProfile);
      setSubscription(remoteSubscription);
      setShoppingSelections(remoteShoppingSelections ?? {});

      if (remoteRecipes && remoteRecipes.length > 0) {
        const mergedRecipes = [...remoteRecipes];
        for (const starterRecipe of RECIPES) {
          if (!mergedRecipes.some((recipe) => recipe.id === starterRecipe.id)) {
            mergedRecipes.push(starterRecipe);
          }
        }
        setRecipes(mergedRecipes);
      } else {
        setRecipes(RECIPES);
      }

      if (remoteMembers && remoteMembers.length > 0) {
        setMembers(remoteMembers);
      } else {
        setMembers([]);
      }

      if (remotePlanner) {
        setPlanner(remotePlanner);
      } else {
        setPlanner(INITIAL_PLANNER);
      }

      setIsLoadingData(false);
    }

    void boot();

    return () => {
      isMounted = false;
    };
  }, [userId, weekStart]);

  useEffect(() => {
    return () => {
      if (recipeImagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(recipeImagePreview);
      }
    };
  }, [recipeImagePreview]);

  useEffect(() => {
    setSelectedRecipeImageError(null);
  }, [selectedRecipeId]);

  const derivedTrialEndsAt = useMemo(() => {
    if (billingProfile?.trial_ends_at) return billingProfile.trial_ends_at;
    if (userCreatedAt) return addDays(new Date(userCreatedAt), TRIAL_DAYS_TOTAL).toISOString();
    return null;
  }, [billingProfile?.trial_ends_at, userCreatedAt]);

  const hasActiveSubscription = useMemo(
    () => isActiveSubscriptionStatus(subscription?.status),
    [subscription?.status]
  );

  const trialDaysLeft = useMemo(() => {
    if (!derivedTrialEndsAt) return TRIAL_DAYS_TOTAL;
    return diffDaysCeil(new Date(), new Date(derivedTrialEndsAt));
  }, [derivedTrialEndsAt]);

  const isTrialActive = useMemo(() => {
    if (!derivedTrialEndsAt) return true;
    return new Date(derivedTrialEndsAt).getTime() > Date.now();
  }, [derivedTrialEndsAt]);

  const canUseApp = hasActiveSubscription || isTrialActive;

  useEffect(() => {
    if (!householdId || !supabase || isLoadingData || !userId || !canUseApp) return;

    const timeout = window.setTimeout(async () => {
      setIsSavingPlanner(true);
      await savePlannerToSupabase(householdId, weekStart, planner);
      setIsSavingPlanner(false);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [planner, householdId, weekStart, isLoadingData, userId, canUseApp]);

  const recipeMap = useMemo(
    () => Object.fromEntries(recipes.map((recipe) => [recipe.id, recipe])) as Record<string, Recipe>,
    [recipes]
  );

  const shoppingList = useMemo(() => buildShoppingList(planner, recipeMap), [planner, recipeMap]);
  const shoppingGroups = useMemo(() => buildShoppingGroups(shoppingList, SPONSORED_PRODUCTS), [shoppingList]);
  const selectedRecipe = selectedRecipeId ? recipeMap[selectedRecipeId] ?? null : null;

  const householdSummary = useMemo(() => {
    const dietTypes = [...new Set(members.flatMap((member) => member.dietTypes))];
    const allergies = [...new Set(members.flatMap((member) => member.allergies))];
    const cuisines = [...new Set(members.flatMap((member) => member.cuisines))];
    return { dietTypes, allergies, cuisines };
  }, [members]);

  const isShoppingItemSelected = (selectionKey: string) => {
    return Boolean(shoppingSelections[selectionKey]);
  };

  const toggleShoppingSelection = async (selectionKey: string) => {
    if (!canUseApp || !householdId) return;

    const nextValue = !shoppingSelections[selectionKey];

    setShoppingSelections((prev) => ({
      ...prev,
      [selectionKey]: nextValue,
    }));

    await saveShoppingSelectionToSupabase(householdId, weekStart, selectionKey, nextValue);
  };

  const startCheckout = async (plan: BillingPlan) => {
    if (!userId || !userEmail) return;

    setBillingError(null);
    setIsStartingCheckout(true);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email: userEmail, plan }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to start checkout");
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error("Missing checkout URL");
    } catch (error: any) {
      setBillingError(error?.message || "Failed to start checkout");
    } finally {
      setIsStartingCheckout(false);
    }
  };

  const swapMeal = (day: string, mealType: MealType) => {
    if (!canUseApp) return;
    const currentId = planner[day][mealType];
    const options = recipes.filter((recipe) => recipe.mealType === mealType && recipe.id !== currentId);
    if (options.length === 0) return;
    const next = options[Math.floor(Math.random() * options.length)];
    setPlanner((prev) => ({ ...prev, [day]: { ...prev[day], [mealType]: next.id } }));
  };

  const startEditMember = (member: Member) => {
    if (!canUseApp) return;
    setEditingMemberId(member.id);
    setMemberForm({
      name: member.name,
      ageGroup: member.ageGroup,
      dietTypes: [...member.dietTypes],
      allergies: [...member.allergies],
      cuisines: [...member.cuisines],
    });
  };

  const cancelEditMember = () => {
    setEditingMemberId(null);
    setMemberForm(EMPTY_MEMBER_FORM);
  };

  const saveMember = async () => {
    if (!canUseApp || !memberForm.name.trim() || !householdId) return;

    if (editingMemberId) {
      const updatedMember: Member = {
        id: editingMemberId,
        name: memberForm.name.trim(),
        ageGroup: memberForm.ageGroup,
        dietTypes: memberForm.dietTypes,
        allergies: memberForm.allergies,
        cuisines: memberForm.cuisines,
      };

      setMembers((prev) => prev.map((member) => (member.id === editingMemberId ? updatedMember : member)));
      await updateMemberInSupabase(updatedMember, householdId);
      cancelEditMember();
      return;
    }

    const newMember: Member = {
      id: createId(),
      name: memberForm.name.trim(),
      ageGroup: memberForm.ageGroup,
      dietTypes: memberForm.dietTypes,
      allergies: memberForm.allergies,
      cuisines: memberForm.cuisines,
    };

    setMembers((prev) => [...prev, newMember]);
    await insertMemberToSupabase(newMember, householdId);
    setMemberForm(EMPTY_MEMBER_FORM);
  };

  const deleteMember = async (memberId: string) => {
    if (!canUseApp) return;
    setMembers((prev) => prev.filter((member) => member.id !== memberId));
    await deleteMemberFromSupabase(memberId);
    if (editingMemberId === memberId) {
      cancelEditMember();
    }
  };

  const clearRecipeImageSelection = () => {
    if (recipeImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(recipeImagePreview);
    }

    setRecipeImageFile(null);
    setGeneratedRecipeImageUrl("");
    setRecipeImagePreview("");
    setRecipeImageError(null);
  };

  const handleRecipeImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;

    if (recipeImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(recipeImagePreview);
    }

    const previewUrl = URL.createObjectURL(file);

    setRecipeImageFile(file);
    setGeneratedRecipeImageUrl("");
    setRecipeImagePreview(previewUrl);
    setRecipeImageError(null);
  };

  const generateRecipeImagePreview = async () => {
    if (!canUseApp) return;

    if (!recipeForm.title.trim()) {
      setRecipeImageError("Please add a recipe title before generating an image.");
      return;
    }

    setIsGeneratingRecipeImage(true);
    setRecipeImageError(null);

    try {
      const response = await fetch("/api/recipe-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe: {
            title: recipeForm.title.trim(),
            mealType: recipeForm.mealType,
            description: recipeForm.description.trim(),
            cuisine: recipeForm.cuisine.trim() || "British",
            tags: ["Manual recipe"],
            ingredients: recipeForm.ingredients
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to generate recipe image");
      }

      if (data?.imageUrl) {
        if (recipeImagePreview.startsWith("blob:")) {
          URL.revokeObjectURL(recipeImagePreview);
        }

        setRecipeImageFile(null);
        setGeneratedRecipeImageUrl(data.imageUrl);
        setRecipeImagePreview(data.imageUrl);
      }
    } catch (error: any) {
      console.error(error);
      setRecipeImageError(error?.message || "Failed to generate recipe image");
    } finally {
      setIsGeneratingRecipeImage(false);
    }
  };

  const addRecipe = async () => {
    if (!canUseApp || !recipeForm.title.trim() || !userId) return;

    setIsSavingRecipe(true);
    setRecipeImageError(null);

    try {
      let finalImageUrl = FALLBACK_RECIPE_IMAGE;

      if (recipeImageFile) {
        const uploadedUrl = await uploadRecipeImage(recipeImageFile, userId, recipeForm.title.trim());
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        }
      } else if (generatedRecipeImageUrl) {
        const storedGeneratedUrl = await uploadRemoteImageToStorage(
          generatedRecipeImageUrl,
          userId,
          recipeForm.title.trim()
        );
        finalImageUrl = storedGeneratedUrl || generatedRecipeImageUrl;
      }

      const newRecipe: Recipe = {
        id: createId(),
        title: recipeForm.title.trim(),
        description: recipeForm.description.trim(),
        mealType: recipeForm.mealType,
        image: finalImageUrl,
        prepTime: 15,
        cookTime: 20,
        serves: 4,
        cuisine: recipeForm.cuisine.trim() || "British",
        tags: ["Manual recipe"],
        allergens: [],
        ingredients: recipeForm.ingredients
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        method: recipeForm.method
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        note: "",
      };

      setRecipes((prev) => [newRecipe, ...prev]);
      await insertRecipeToSupabase(newRecipe, userId);

      setRecipeForm(EMPTY_RECIPE_FORM);
      clearRecipeImageSelection();
      setTab("recipes");
    } catch (error: any) {
      console.error(error);
      setRecipeImageError(error?.message || "Failed to save recipe");
    } finally {
      setIsSavingRecipe(false);
    }
  };

  const updateNote = (recipeId: string, note: string) => {
    if (!canUseApp) return;
    setRecipes((prev) => prev.map((recipe) => (recipe.id === recipeId ? { ...recipe, note } : recipe)));
    void updateRecipeNoteInSupabase(recipeId, note);
  };

  const applyRecipeImageUpdate = async (recipeId: string, imageUrl: string) => {
    setRecipes((prev) => prev.map((recipe) => (recipe.id === recipeId ? { ...recipe, image: imageUrl } : recipe)));
    await updateRecipeImageInSupabase(recipeId, imageUrl);
  };

  const handleSelectedRecipeImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    recipe: Recipe
  ) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file || !userId) return;

    setSelectedRecipeImageError(null);
    setUploadingRecipeImageId(recipe.id);

    try {
      const uploadedUrl = await uploadRecipeImage(file, userId, recipe.title);
      if (!uploadedUrl) {
        throw new Error("Failed to upload image");
      }

      await applyRecipeImageUpdate(recipe.id, uploadedUrl);
    } catch (error: any) {
      console.error(error);
      setSelectedRecipeImageError(error?.message || "Failed to upload recipe image");
    } finally {
      setUploadingRecipeImageId(null);
    }
  };

  const refreshRecipeImage = async (recipe: Recipe) => {
    if (!canUseApp || !userId) return;

    setRefreshingImageId(recipe.id);
    setSelectedRecipeImageError(null);

    try {
      const response = await fetch("/api/recipe-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe: {
            id: recipe.id,
            title: recipe.title,
            mealType: recipe.mealType,
            description: recipe.description,
            cuisine: recipe.cuisine,
            tags: recipe.tags,
            ingredients: recipe.ingredients,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to refresh image");
      }

      if (data?.imageUrl) {
        const storedGeneratedUrl = await uploadRemoteImageToStorage(data.imageUrl, userId, recipe.title);
        const finalUrl = storedGeneratedUrl || data.imageUrl;
        await applyRecipeImageUpdate(recipe.id, finalUrl);
      }
    } catch (error: any) {
      console.error(error);
      setSelectedRecipeImageError(error?.message || "Failed to refresh recipe image");
    } finally {
      setRefreshingImageId(null);
    }
  };

  const regenerateWeek = async () => {
    if (!canUseApp) return;

    setIsGeneratingPlanner(true);
    try {
      const response = await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ members, recipes, useLeftovers, currentPlanner: planner }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to generate plan");
      }

      if (Array.isArray(data?.generatedRecipes) && data.generatedRecipes.length > 0) {
        setRecipes((prev) => {
          const merged = [...prev];
          for (const recipe of data.generatedRecipes) {
            if (!merged.some((existing) => existing.id === recipe.id)) {
              merged.unshift(recipe);
            }
          }
          return merged;
        });
      }

      setFreshRecipeIds(Array.isArray(data?.freshRecipeIds) ? data.freshRecipeIds : []);

      if (data?.planner) {
        setPlanner(data.planner as Planner);
      }
    } finally {
      setIsGeneratingPlanner(false);
    }
  };

  const signOut = async () => {
    await authSupabase.auth.signOut();
    window.location.href = "/login";
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <p>Loading…</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1>Sign in required</h1>
          <p>Please log in to use MealMap.</p>
          <button
            onClick={() => {
              window.location.href = "/login";
            }}
            style={{
              borderRadius: 16,
              border: 0,
              background: "#059669",
              color: "white",
              padding: "12px 16px",
              cursor: "pointer",
            }}
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#fffbeb,#fff7ed,#ecfdf5)", color: "#171717" }}>
      <style>{`
        @keyframes mealmapProgress {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(320%); }
        }
      `}</style>

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          borderBottom: "1px solid #fed7aa",
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: isMobile ? "stretch" : "center",
            padding: "14px 16px",
            gap: 12,
            flexWrap: "wrap",
            flexDirection: isMobile ? "column" : "row",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 16,
                background: "linear-gradient(135deg,#f97316 0%, #fb923c 38%, #10b981 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 6px 18px rgba(16,185,129,0.16)",
                position: "relative",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0))",
                }}
              />

              <div
                style={{
                  position: "relative",
                  width: 24,
                  height: 30,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 999,
                      border: "2px solid #f97316",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div
                  style={{
                    position: "absolute",
                    top: 16,
                    width: 0,
                    height: 0,
                    borderLeft: "7px solid transparent",
                    borderRight: "7px solid transparent",
                    borderTop: "12px solid white",
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 4,
                    width: 2,
                    height: 8,
                    borderRadius: 999,
                    background: "#10b981",
                    transform: "rotate(20deg)",
                  }}
                />
              </div>
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "#737373", letterSpacing: 0.2 }}>Household meal planning</div>
              <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.05 }}>
                <span style={{ color: "#171717" }}>Meal</span>
                <span style={{ color: "#f97316" }}>Map</span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: isMobile ? "flex-start" : "flex-end",
              width: isMobile ? "100%" : "auto",
            }}
          >
            {userEmail && <span style={badgeStyle("#f5f5f5", "#404040")}>{userEmail}</span>}
            {isLoadingData && <span style={badgeStyle("#e5e5e5", "#404040")}>Loading…</span>}
            {isSavingPlanner && <span style={badgeStyle("#ffedd5", "#9a3412")}>Saving week…</span>}
            {hasActiveSubscription ? (
              <span style={badgeStyle("#dcfce7", "#166534")}>Subscribed</span>
            ) : isTrialActive ? (
              <span style={badgeStyle("#fff7ed", "#c2410c")}>{trialDaysLeft} days left free</span>
            ) : (
              <span style={badgeStyle("#fee2e2", "#b91c1c")}>Trial ended</span>
            )}
            <span style={badgeStyle("#059669", "white")}>{dataSourceLabel}</span>
            <button
              onClick={() => void startCheckout("monthly")}
              disabled={isStartingCheckout}
              style={{
                borderRadius: 12,
                border: "1px solid #d4d4d4",
                background: "white",
                padding: "8px 12px",
                cursor: "pointer",
                opacity: isStartingCheckout ? 0.7 : 1,
              }}
            >
              {isStartingCheckout ? "Loading…" : "Billing"}
            </button>
            <button
              onClick={signOut}
              style={{ borderRadius: 12, border: "1px solid #d4d4d4", background: "white", padding: "8px 12px", cursor: "pointer" }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
        {!canUseApp && (
          <div style={{ ...cardStyle(), marginBottom: 24, border: "1px solid #fecaca", background: "#fef2f2" }}>
            <h3 style={{ marginTop: 0 }}>Your free 3 weeks have ended</h3>
            <p style={{ color: "#525252", marginBottom: 16 }}>
              You can still view your saved household and plans, but editing and regeneration are locked until you subscribe.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => void startCheckout("monthly")}
                disabled={isStartingCheckout}
                style={{
                  borderRadius: 16,
                  border: 0,
                  background: "#059669",
                  color: "white",
                  padding: "12px 16px",
                  cursor: "pointer",
                  opacity: isStartingCheckout ? 0.7 : 1,
                }}
              >
                Start monthly plan — £1.95/month
              </button>
              <button
                onClick={() => void startCheckout("yearly")}
                disabled={isStartingCheckout}
                style={{
                  borderRadius: 16,
                  border: "1px solid #bbf7d0",
                  background: "#f0fdf4",
                  color: "#166534",
                  padding: "12px 16px",
                  cursor: "pointer",
                  opacity: isStartingCheckout ? 0.7 : 1,
                }}
              >
                Start annual plan — £20/year
              </button>
            </div>
            {billingError && <p style={{ color: "#b91c1c", marginTop: 12 }}>{billingError}</p>}
          </div>
        )}

        <section
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr" : "minmax(0,1.4fr) minmax(320px,0.9fr)",
            marginBottom: 24,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              ...cardStyle(),
              position: "relative",
              overflow: "hidden",
              minHeight: isMobile ? 260 : 320,
              display: "flex",
              alignItems: "stretch",
              padding: 0,
              backgroundImage:
                "linear-gradient(90deg, rgba(23,23,23,0.78) 0%, rgba(23,23,23,0.62) 42%, rgba(23,23,23,0.18) 100%), url('https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1600&q=80')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              border: "1px solid #fed7aa",
            }}
          >
            <div
              style={{
                position: "relative",
                zIndex: 1,
                padding: isMobile ? 20 : 28,
                maxWidth: 680,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: isMobile ? 14 : 18,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fdba74", fontSize: 14 }}>
                <Sparkles size={16} /> Smarter meal planning for real households
              </div>

              <h2
                style={{
                  fontSize: "clamp(30px, 6vw, 42px)",
                  lineHeight: 1.05,
                  margin: 0,
                  color: "white",
                  maxWidth: 560,
                }}
              >
                Plan meals your whole household can actually eat.
              </h2>

              <p
                style={{
                  color: "rgba(255,255,255,0.88)",
                  margin: 0,
                  fontSize: 16,
                  lineHeight: 1.6,
                  maxWidth: 560,
                }}
              >
                Keep diets, allergies and cuisine preferences in one place, build a full weekly menu, and turn it into a simpler shopping list in seconds.
              </p>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={badgeStyle("rgba(255,255,255,0.92)", "#166534")}>Meal plans</span>
                <span style={badgeStyle("rgba(255,255,255,0.92)", "#9a3412")}>Shopping lists</span>
                <span style={badgeStyle("rgba(255,255,255,0.92)", "#3730a3")}>Household preferences</span>
                <span style={badgeStyle("rgba(255,255,255,0.92)", "#065f46")}>Balanced weekly planning</span>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  maxWidth: 540,
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center", color: "white", fontSize: 15 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 999, background: "#34d399", flexShrink: 0 }} />
                  <span>One shared plan for breakfast, lunch and dinner</span>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", color: "white", fontSize: 15 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 999, background: "#fb923c", flexShrink: 0 }} />
                  <span>Household-aware choices based on diets and allergies</span>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", color: "white", fontSize: 15 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 999, background: "#93c5fd", flexShrink: 0 }} />
                  <span>Shopping lists grouped by aisle, with optional product suggestions</span>
                </div>
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  width: "fit-content",
                  maxWidth: "100%",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.14)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  color: "white",
                  padding: "10px 14px",
                  fontSize: 14,
                  flexWrap: "wrap",
                }}
              >
                <Users size={16} />
                Built for busy households who want less planning stress, less food waste, and a more balanced week
              </div>
            </div>
          </div>

          <div style={cardStyle()}>
            <h3 style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 0 }}>
              <Users size={18} /> Household fit
            </h3>
            <p style={{ color: "#737373" }}>{householdId ? "Household connected" : "Current rules and profile summary"}</p>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Diet types</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {householdSummary.dietTypes.length > 0
                  ? householdSummary.dietTypes.map((diet) => (
                      <span key={diet} style={badgeStyle("#dcfce7", "#166534")}>
                        {diet}
                      </span>
                    ))
                  : <span style={badgeStyle("#f5f5f5", "#404040")}>No special diets</span>}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Declared allergies</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {householdSummary.allergies.length > 0
                  ? householdSummary.allergies.map((allergy) => (
                      <span key={allergy} style={badgeStyle("#171717", "white")}>
                        {allergy}
                      </span>
                    ))
                  : <span style={badgeStyle("#f5f5f5", "#404040")}>None added</span>}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Preferred cuisines</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {householdSummary.cuisines.length > 0
                  ? householdSummary.cuisines.map((cuisine) => (
                      <span key={cuisine} style={badgeStyle("#eef2ff", "#3730a3")}>
                        {cuisine}
                      </span>
                    ))
                  : <span style={badgeStyle("#f5f5f5", "#404040")}>No cuisine preferences</span>}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#ecfdf5",
                borderRadius: 16,
                padding: 12,
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Use leftovers in planning</div>
                <div style={{ fontSize: 12, color: "#737373" }}>Reduce waste and repeat ingredients smartly</div>
              </div>
              <input
                type="checkbox"
                checked={useLeftovers}
                disabled={!canUseApp}
                onChange={(e) => setUseLeftovers(e.target.checked)}
              />
            </div>
          </div>
        </section>

        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 24,
            flexWrap: isMobile ? "nowrap" : "wrap",
            overflowX: isMobile ? "auto" : "visible",
            paddingBottom: isMobile ? 6 : 0,
          }}
        >
          {(["planner", "household", "shopping", "manual", "recipes"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                borderRadius: 16,
                border: `1px solid ${tab === key ? "#f97316" : "#fed7aa"}`,
                background: tab === key ? "#f97316" : "white",
                color: tab === key ? "white" : "#404040",
                padding: "12px 16px",
                cursor: "pointer",
                minWidth: isMobile ? 140 : 120,
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              {key === "manual" ? "Add recipe" : key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>

        {tab === "planner" && (
          <div
            style={{
              display: "grid",
              gap: 24,
              gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr" : "minmax(0,1.35fr) minmax(300px,0.85fr)",
              alignItems: "start",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 16,
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h3 style={{ fontSize: 30, margin: 0 }}>This week’s menu</h3>
                  <p style={{ color: "#737373", margin: "6px 0 0 0" }}>
                    {weekDateRange} · Breakfast, lunch and dinner for every day.
                  </p>
                </div>

                <div style={{ minWidth: 220, width: "min(100%, 320px)" }}>
                  <button
                    onClick={regenerateWeek}
                    disabled={isGeneratingPlanner || !canUseApp}
                    style={{
                      width: "100%",
                      borderRadius: 16,
                      border: 0,
                      background: "#059669",
                      color: "white",
                      padding: "10px 16px",
                      cursor: canUseApp ? "pointer" : "not-allowed",
                      opacity: isGeneratingPlanner || !canUseApp ? 0.75 : 1,
                    }}
                  >
                    <Sparkles size={16} style={{ marginRight: 8, verticalAlign: "middle" }} />
                    {isGeneratingPlanner ? "Generating…" : "Regenerate week"}
                  </button>

                  {isGeneratingPlanner && (
                    <div
                      style={{
                        marginTop: 10,
                        height: 6,
                        width: "100%",
                        background: "#d1fae5",
                        borderRadius: 999,
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          height: "100%",
                          width: "38%",
                          borderRadius: 999,
                          background: "#059669",
                          animation: "mealmapProgress 1.2s ease-in-out infinite",
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 16,
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))",
                }}
              >
                {DAYS.map((day) => (
                  <div key={day} style={cardStyle()}>
                    <h4 style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 0 }}>
                      <CalendarDays size={16} /> {day}
                    </h4>
                    <div style={{ display: "grid", gap: 16 }}>
                      {MEAL_TYPES.map((mealType) => {
                        const recipe = recipeMap[planner[day][mealType]];
                        if (!recipe) return null;
                        const rating = ratings[recipe.id];

                        return (
                          <div
                            key={`${day}-${mealType}`}
                            style={{
                              border: "1px solid #fed7aa",
                              background: "rgba(255,247,237,0.6)",
                              borderRadius: 16,
                              padding: 12,
                            }}
                          >
                            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                              <img
                                src={recipe.image}
                                alt={recipe.title}
                                style={{ width: 80, height: 80, borderRadius: 16, objectFit: "cover", flexShrink: 0 }}
                              />
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                                  <span style={badgeStyle("#ffedd5", "#9a3412")}>{mealType}</span>
                                  {freshRecipeIds.includes(recipe.id) && <span style={badgeStyle("#dcfce7", "#166534")}>New</span>}
                                  {rating === "like" && <span style={badgeStyle("#f5f5f5", "#404040")}>Liked</span>}
                                  {rating === "dislike" && <span style={badgeStyle("#dc2626", "white")}>Disliked</span>}
                                </div>
                                <div style={{ fontWeight: 600 }}>{recipe.title}</div>
                                <div style={{ fontSize: 14, color: "#737373" }}>{recipe.description}</div>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button
                                onClick={() => setSelectedRecipeId(recipe.id)}
                                style={{
                                  borderRadius: 12,
                                  border: "1px solid #fed7aa",
                                  background: "white",
                                  color: "#c2410c",
                                  padding: "8px 12px",
                                  cursor: "pointer",
                                }}
                              >
                                Open
                              </button>
                              <button
                                onClick={() => swapMeal(day, mealType)}
                                disabled={!canUseApp}
                                style={{
                                  borderRadius: 12,
                                  border: "1px solid #a7f3d0",
                                  background: "white",
                                  color: "#047857",
                                  padding: "8px 12px",
                                  cursor: canUseApp ? "pointer" : "not-allowed",
                                  opacity: canUseApp ? 1 : 0.6,
                                }}
                              >
                                <RefreshCw size={14} style={{ marginRight: 4, verticalAlign: "middle" }} /> Replace
                              </button>
                              <button
                                onClick={() => setRatings((prev) => ({ ...prev, [recipe.id]: prev[recipe.id] === "like" ? null : "like" }))}
                                style={{ borderRadius: 12, border: "1px solid #e5e5e5", background: "white", padding: 8, cursor: "pointer" }}
                              >
                                <Heart size={16} />
                              </button>
                              <button
                                onClick={() => setRatings((prev) => ({ ...prev, [recipe.id]: prev[recipe.id] === "dislike" ? null : "dislike" }))}
                                style={{ borderRadius: 12, border: "1px solid #e5e5e5", background: "white", padding: 8, cursor: "pointer" }}
                              >
                                <ThumbsDown size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: 16,
                alignContent: "start",
                alignSelf: "start",
                gridTemplateColumns: isTablet ? "repeat(2,minmax(0,1fr))" : "1fr",
              }}
            >
              <div style={{ ...cardStyle(), background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <h3 style={{ marginTop: 0 }}>Balanced week</h3>
                <p style={{ color: "#166534", marginBottom: 10 }}>
                  Weekly plans are designed to support a balanced and nutritious diet across the week.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={badgeStyle("#dcfce7", "#166534")}>Variety across meals</span>
                  <span style={badgeStyle("#dcfce7", "#166534")}>Household-aware choices</span>
                  <span style={badgeStyle("#dcfce7", "#166534")}>Seasonal produce encouraged</span>
                </div>
              </div>

              <div style={cardStyle()}>
                <h3 style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 0 }}>
                  <ShoppingCart size={18} /> Weekly shopping
                </h3>
                <p style={{ color: "#737373" }}>
                  {shoppingList.length} consolidated ingredients across {shoppingGroups.length} aisles
                </p>

                <div style={{ display: "grid", gap: 12 }}>
                  {shoppingGroups.map((group) => (
                    <div key={group.category} style={{ border: "1px solid #e5e5e5", borderRadius: 16, padding: 12, background: "#fffdf8" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 700 }}>{group.category}</div>
                        <span style={badgeStyle("#f5f5f5", "#404040")}>{group.items.length} items</span>
                      </div>

                      <div style={{ display: "grid", gap: 8 }}>
                        {group.items.map((item) => {
                          const selectionKey = makeShoppingSelectionKey(item);
                          const checked = isShoppingItemSelected(selectionKey);

                          return (
                            <label
                              key={`${group.category}-${item}`}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                fontSize: 14,
                                borderRadius: 12,
                                padding: "10px 12px",
                                background: checked ? "#ecfdf5" : "#fff7ed",
                                cursor: canUseApp ? "pointer" : "not-allowed",
                                opacity: canUseApp ? 1 : 0.7,
                                gap: 12,
                              }}
                            >
                              <span>{item}</span>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!canUseApp}
                                onChange={() => void toggleShoppingSelection(selectionKey)}
                              />
                            </label>
                          );
                        })}
                      </div>

                      {group.sponsoredProduct && (() => {
                        const selectionKey = makeSponsoredSelectionKey(group.sponsoredProduct.id);
                        const checked = isShoppingItemSelected(selectionKey);

                        return (
                          <label
                            style={{
                              display: "block",
                              marginTop: 10,
                              border: "1px solid #dbeafe",
                              background: checked ? "#dbeafe" : "#f0f9ff",
                              borderRadius: 12,
                              padding: 10,
                              cursor: canUseApp ? "pointer" : "not-allowed",
                              opacity: canUseApp ? 1 : 0.7,
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span style={badgeStyle("#0284c7", "white")}>Sponsored</span>
                                <span style={{ fontSize: 12, color: "#737373" }}>Add this item to this week’s shopping list</span>
                              </div>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!canUseApp}
                                onChange={() => void toggleShoppingSelection(selectionKey)}
                              />
                            </div>

                            <img
                              src={group.sponsoredProduct.image}
                              alt={`${group.sponsoredProduct.brand} ${group.sponsoredProduct.product}`}
                              style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 12, marginBottom: 10 }}
                            />

                            <div style={{ fontSize: 12, color: "#737373", marginBottom: 6 }}>
                              Suggested in {group.category}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>
                              {group.sponsoredProduct.brand} — {group.sponsoredProduct.product}
                            </div>
                            <div style={{ fontSize: 12, color: "#525252", marginTop: 4 }}>
                              {group.sponsoredProduct.context}
                            </div>
                          </label>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>

              <div style={cardStyle()}>
                <h3 style={{ marginTop: 0 }}>Sponsored picks</h3>
                <p style={{ color: "#737373" }}>Clearly labelled product suggestions</p>

                <div style={{ display: "grid", gap: 12 }}>
                  {SPONSORED_PRODUCTS.slice(0, 2).map((product) => (
                    <div key={product.id} style={{ border: "1px solid #dbeafe", background: "#f0f9ff", borderRadius: 16, padding: 12 }}>
                      <img
                        src={product.image}
                        alt={`${product.brand} ${product.product}`}
                        style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 12, marginBottom: 10 }}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                        <span style={badgeStyle("#0284c7", "white")}>Sponsored</span>
                        <span style={{ fontSize: 12, color: "#737373" }}>{product.match}</span>
                      </div>
                      <div style={{ fontWeight: 600 }}>{product.brand} — {product.product}</div>
                      <div style={{ fontSize: 14, color: "#525252", marginTop: 4 }}>{product.context}</div>
                      <button
                        style={{
                          marginTop: 10,
                          borderRadius: 12,
                          border: "1px solid #bae6fd",
                          background: "white",
                          color: "#0369a1",
                          padding: "8px 12px",
                          cursor: "pointer",
                        }}
                      >
                        View product
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={cardStyle()}>
                <h3 style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 0 }}>
                  <Share2 size={18} /> Tell a friend
                </h3>
                <p style={{ color: "#737373" }}>Built-in referral loop</p>
                <div style={{ background: "#fff7ed", borderRadius: 16, padding: 12, color: "#c2410c", fontSize: 14 }}>
                  mealmap.app/invite/alex-household
                </div>
                <div style={{ marginTop: 12, border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 16, padding: 12, fontSize: 14, color: "#166534" }}>
                  3 weeks free, then £1.95/month or £20/year. Sponsored product suggestions can also help support low pricing.
                </div>
              </div>

              <div style={cardStyle()}>
                <h3 style={{ marginTop: 0 }}>Subscription preview</h3>
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ border: "1px solid #fed7aa", background: "#fff7ed", borderRadius: 16, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{hasActiveSubscription ? "Subscription active" : "Free trial"}</div>
                        <div style={{ fontSize: 14, color: "#737373" }}>
                          {hasActiveSubscription
                            ? subscription?.interval === "year"
                              ? "Annual plan"
                              : "Monthly plan"
                            : isTrialActive
                              ? `${trialDaysLeft} of ${TRIAL_DAYS_TOTAL} days remaining`
                              : "Trial has ended"}
                        </div>
                      </div>
                      {hasActiveSubscription ? (
                        <span style={badgeStyle("#059669", "white")}>Active</span>
                      ) : isTrialActive ? (
                        <span style={badgeStyle("#ea580c", "white")}>No restrictions</span>
                      ) : (
                        <span style={badgeStyle("#dc2626", "white")}>Upgrade required</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
                    <div style={{ border: "1px solid #e5e5e5", borderRadius: 16, padding: 12, background: "white" }}>
                      <div style={{ fontSize: 14, color: "#737373" }}>Monthly</div>
                      <div style={{ fontSize: 28, fontWeight: 700 }}>£1.95</div>
                      <div style={{ fontSize: 14, color: "#737373" }}>per month</div>
                      <button
                        onClick={() => void startCheckout("monthly")}
                        disabled={isStartingCheckout}
                        style={{ marginTop: 10, width: "100%", borderRadius: 12, border: 0, background: "#059669", color: "white", padding: "10px 12px", cursor: "pointer", opacity: isStartingCheckout ? 0.7 : 1 }}
                      >
                        Start monthly
                      </button>
                    </div>

                    <div style={{ border: "2px solid #bbf7d0", borderRadius: 16, padding: 12, background: "#f0fdf4" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 14, color: "#737373" }}>Annual</div>
                        <span style={badgeStyle("#059669", "white")}>Best value</span>
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 700 }}>£20</div>
                      <div style={{ fontSize: 14, color: "#737373" }}>per year</div>
                      <button
                        onClick={() => void startCheckout("yearly")}
                        disabled={isStartingCheckout}
                        style={{ marginTop: 10, width: "100%", borderRadius: 12, border: 0, background: "#059669", color: "white", padding: "10px 12px", cursor: "pointer", opacity: isStartingCheckout ? 0.7 : 1 }}
                      >
                        Start annual
                      </button>
                    </div>
                  </div>

                  {billingError && <div style={{ color: "#b91c1c", fontSize: 14 }}>{billingError}</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "household" && (
          <div
            style={{
              display: "grid",
              gap: 24,
              gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
            }}
          >
            <div style={cardStyle()}>
              <h3 style={{ marginTop: 0 }}>{editingMemberId ? "Edit household member" : "Set up household member"}</h3>
              <p style={{ color: "#737373", marginTop: -4, marginBottom: 16 }}>Structured preferences help generate better weekly plans.</p>

              <div style={{ display: "grid", gap: 12 }}>
                <input
                  placeholder="Name"
                  value={memberForm.name}
                  disabled={!canUseApp}
                  onChange={(e) => setMemberForm((prev) => ({ ...prev, name: e.target.value }))}
                  style={{ padding: 12, borderRadius: 12, border: "1px solid #d4d4d4" }}
                />

                <select
                  value={memberForm.ageGroup}
                  disabled={!canUseApp}
                  onChange={(e) => setMemberForm((prev) => ({ ...prev, ageGroup: e.target.value }))}
                  style={{ padding: 12, borderRadius: 12, border: "1px solid #d4d4d4" }}
                >
                  {AGE_GROUP_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                </select>

                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Diet types</div>
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
                    {DIET_TYPE_OPTIONS.map((option) => (
                      <label key={option} style={{ display: "flex", gap: 10, alignItems: "center", border: "1px solid #dcfce7", background: "#f0fdf4", borderRadius: 12, padding: "10px 12px", fontSize: 14, opacity: canUseApp ? 1 : 0.65 }}>
                        <input
                          type="checkbox"
                          disabled={!canUseApp}
                          checked={memberForm.dietTypes.includes(option)}
                          onChange={() => setMemberForm((prev) => ({ ...prev, dietTypes: toggleValue(prev.dietTypes, option) }))}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Allergies</div>
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
                    {ALLERGY_OPTIONS.map((option) => (
                      <label key={option} style={{ display: "flex", gap: 10, alignItems: "center", border: "1px solid #fed7aa", background: "#fff7ed", borderRadius: 12, padding: "10px 12px", fontSize: 14, opacity: canUseApp ? 1 : 0.65 }}>
                        <input
                          type="checkbox"
                          disabled={!canUseApp}
                          checked={memberForm.allergies.includes(option)}
                          onChange={() => setMemberForm((prev) => ({ ...prev, allergies: toggleValue(prev.allergies, option) }))}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Cuisine preferences</div>
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
                    {CUISINE_OPTIONS.map((option) => (
                      <label key={option} style={{ display: "flex", gap: 10, alignItems: "center", border: "1px solid #a7f3d0", background: "#ecfdf5", borderRadius: 12, padding: "10px 12px", fontSize: 14, opacity: canUseApp ? 1 : 0.65 }}>
                        <input
                          type="checkbox"
                          disabled={!canUseApp}
                          checked={memberForm.cuisines.includes(option)}
                          onChange={() => setMemberForm((prev) => ({ ...prev, cuisines: toggleValue(prev.cuisines, option) }))}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={saveMember}
                    disabled={!canUseApp}
                    style={{ flex: 1, borderRadius: 16, border: 0, background: "#059669", color: "white", padding: "12px 16px", cursor: canUseApp ? "pointer" : "not-allowed", opacity: canUseApp ? 1 : 0.65 }}
                  >
                    {editingMemberId ? <><Pencil size={16} style={{ marginRight: 6, verticalAlign: "middle" }} /> Save changes</> : <><Plus size={16} style={{ marginRight: 6, verticalAlign: "middle" }} /> Add member</>}
                  </button>

                  {editingMemberId && (
                    <button
                      onClick={cancelEditMember}
                      style={{ borderRadius: 16, border: "1px solid #d4d4d4", background: "white", padding: "12px 16px", cursor: "pointer" }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={cardStyle()}>
              <h3 style={{ marginTop: 0 }}>Current household</h3>
              <p style={{ color: "#737373", marginTop: -4, marginBottom: 16 }}>Each member stores age group, diet types, allergies, and cuisine preferences.</p>

              <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
                {members.map((member) => (
                  <div key={member.id} style={{ border: "1px solid #dbeafe", borderRadius: 20, padding: 16, background: "linear-gradient(180deg,#ffffff,#f8fafc)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 16, background: "linear-gradient(135deg,#f97316,#10b981)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>
                          {getMemberInitials(member.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{member.name}</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                            <span style={badgeStyle("#f5f5f5", "#404040")}>{member.ageGroup}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => startEditMember(member)}
                          disabled={!canUseApp}
                          style={{ borderRadius: 12, border: "1px solid #d4d4d4", background: "white", color: "#404040", padding: 8, cursor: canUseApp ? "pointer" : "not-allowed", opacity: canUseApp ? 1 : 0.6 }}
                          aria-label={`Edit ${member.name}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => void deleteMember(member.id)}
                          disabled={!canUseApp}
                          style={{ borderRadius: 12, border: "1px solid #fecaca", background: "white", color: "#dc2626", padding: 8, cursor: canUseApp ? "pointer" : "not-allowed", opacity: canUseApp ? 1 : 0.6 }}
                          aria-label={`Delete ${member.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: 14, color: "#525252", display: "grid", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 600, color: "#171717", marginBottom: 6 }}>Diet types</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {member.dietTypes.length > 0
                            ? member.dietTypes.map((diet) => <span key={diet} style={badgeStyle("#dcfce7", "#166534")}>{diet}</span>)
                            : <span style={badgeStyle("#f5f5f5", "#404040")}>None</span>}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontWeight: 600, color: "#171717", marginBottom: 6 }}>Allergies</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {member.allergies.length > 0
                            ? member.allergies.map((allergy) => <span key={allergy} style={badgeStyle("#171717", "white")}>{allergy}</span>)
                            : <span style={badgeStyle("#f5f5f5", "#404040")}>None</span>}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontWeight: 600, color: "#171717", marginBottom: 6 }}>Cuisines</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {member.cuisines.length > 0
                            ? member.cuisines.map((cuisine) => <span key={cuisine} style={badgeStyle("#eef2ff", "#3730a3")}>{cuisine}</span>)
                            : <span style={badgeStyle("#f5f5f5", "#404040")}>No preference</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "shopping" && (
          <div style={cardStyle()}>
            <h3 style={{ marginTop: 0 }}>This week’s shopping list</h3>
            <p style={{ color: "#737373", marginBottom: 8 }}>
              Select the items you want to buy this week.
            </p>
            <p style={{ color: "#737373", marginBottom: 16 }}>
              {shoppingList.length} ingredients grouped into {shoppingGroups.length} supermarket sections
            </p>

            <div style={{ display: "grid", gap: 16 }}>
              {shoppingGroups.map((group) => (
                <div key={group.category} style={{ border: "1px solid #e5e5e5", borderRadius: 18, padding: 16, background: "#fffdf8" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
                    <h4 style={{ margin: 0 }}>{group.category}</h4>
                    <span style={badgeStyle("#f5f5f5", "#404040")}>{group.items.length} items</span>
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    {group.items.map((item) => {
                      const selectionKey = makeShoppingSelectionKey(item);
                      const checked = isShoppingItemSelected(selectionKey);

                      return (
                        <label
                          key={`${group.category}-${item}`}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            border: "1px solid #f1f5f9",
                            borderRadius: 14,
                            padding: 12,
                            background: checked ? "#ecfdf5" : "white",
                            cursor: canUseApp ? "pointer" : "not-allowed",
                            opacity: canUseApp ? 1 : 0.7,
                            gap: 12,
                          }}
                        >
                          <span style={{ fontSize: 14 }}>{item}</span>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!canUseApp}
                            onChange={() => void toggleShoppingSelection(selectionKey)}
                          />
                        </label>
                      );
                    })}
                  </div>

                  {group.sponsoredProduct && (() => {
                    const selectionKey = makeSponsoredSelectionKey(group.sponsoredProduct.id);
                    const checked = isShoppingItemSelected(selectionKey);

                    return (
                      <label
                        style={{
                          display: "block",
                          marginTop: 12,
                          border: "1px solid #dbeafe",
                          background: checked ? "#dbeafe" : "#f0f9ff",
                          borderRadius: 14,
                          padding: 12,
                          cursor: canUseApp ? "pointer" : "not-allowed",
                          opacity: canUseApp ? 1 : 0.7,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={badgeStyle("#0284c7", "white")}>Sponsored</span>
                            <span style={{ fontSize: 12, color: "#737373" }}>Add this item to this week’s shopping list</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!canUseApp}
                            onChange={() => void toggleShoppingSelection(selectionKey)}
                          />
                        </div>

                        <img
                          src={group.sponsoredProduct.image}
                          alt={`${group.sponsoredProduct.brand} ${group.sponsoredProduct.product}`}
                          style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 12, marginBottom: 10 }}
                        />

                        <div style={{ fontSize: 12, color: "#737373", marginBottom: 6 }}>
                          Suggested in {group.category}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>
                          {group.sponsoredProduct.brand} — {group.sponsoredProduct.product}
                        </div>
                        <div style={{ fontSize: 13, color: "#525252", marginTop: 4 }}>
                          {group.sponsoredProduct.context}
                        </div>
                      </label>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "manual" && (
          <div
            style={{
              ...cardStyle(),
              maxWidth: 960,
              width: "100%",
              margin: "0 auto",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Add a recipe</h3>
            <p style={{ color: "#737373", marginTop: -4, marginBottom: 16 }}>
              Create your own recipe and add it to your household library.
            </p>

            <div style={{ display: "grid", gap: 16 }}>
              <input
                placeholder="Recipe title"
                value={recipeForm.title}
                disabled={!canUseApp}
                onChange={(e) => setRecipeForm((prev) => ({ ...prev, title: e.target.value }))}
                style={{ padding: 12, borderRadius: 12, border: "1px solid #d4d4d4" }}
              />

              <textarea
                placeholder="Brief description"
                value={recipeForm.description}
                disabled={!canUseApp}
                onChange={(e) => setRecipeForm((prev) => ({ ...prev, description: e.target.value }))}
                style={{ minHeight: 80, padding: 12, borderRadius: 12, border: "1px solid #d4d4d4" }}
              />

              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                }}
              >
                <select
                  value={recipeForm.mealType}
                  disabled={!canUseApp}
                  onChange={(e) =>
                    setRecipeForm((prev) => ({ ...prev, mealType: e.target.value as MealType }))
                  }
                  style={{ padding: 12, borderRadius: 12, border: "1px solid #d4d4d4" }}
                >
                  <option>Breakfast</option>
                  <option>Lunch</option>
                  <option>Dinner</option>
                </select>

                <input
                  placeholder="Cuisine"
                  value={recipeForm.cuisine}
                  disabled={!canUseApp}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, cuisine: e.target.value }))}
                  style={{ padding: 12, borderRadius: 12, border: "1px solid #d4d4d4" }}
                />
              </div>

              <div
                style={{
                  border: "1px solid #fed7aa",
                  borderRadius: 18,
                  padding: 16,
                  background: "#fffdf8",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Recipe image</div>
                <p style={{ color: "#737373", fontSize: 14, marginTop: 0, marginBottom: 14 }}>
                  Upload your own image, or generate one from the recipe details.
                </p>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                  <label
                    style={{
                      borderRadius: 12,
                      border: "1px solid #d4d4d4",
                      background: "white",
                      padding: "10px 14px",
                      cursor: canUseApp ? "pointer" : "not-allowed",
                      opacity: canUseApp ? 1 : 0.65,
                    }}
                  >
                    Upload image
                    <input
                      type="file"
                      accept="image/*"
                      disabled={!canUseApp}
                      onChange={handleRecipeImageFileChange}
                      style={{ display: "none" }}
                    />
                  </label>

                  <button
                    onClick={() => void generateRecipeImagePreview()}
                    disabled={!canUseApp || isGeneratingRecipeImage}
                    style={{
                      borderRadius: 12,
                      border: 0,
                      background: "#059669",
                      color: "white",
                      padding: "10px 14px",
                      cursor: canUseApp ? "pointer" : "not-allowed",
                      opacity: !canUseApp || isGeneratingRecipeImage ? 0.7 : 1,
                    }}
                  >
                    {isGeneratingRecipeImage ? "Generating…" : "Generate image"}
                  </button>

                  {(recipeImagePreview || recipeImageFile || generatedRecipeImageUrl) && (
                    <button
                      onClick={clearRecipeImageSelection}
                      type="button"
                      style={{
                        borderRadius: 12,
                        border: "1px solid #d4d4d4",
                        background: "white",
                        padding: "10px 14px",
                        cursor: "pointer",
                      }}
                    >
                      Remove image
                    </button>
                  )}
                </div>

                <div
                  style={{
                    borderRadius: 16,
                    overflow: "hidden",
                    border: "1px dashed #fdba74",
                    background: "#fff7ed",
                    minHeight: isMobile ? 180 : 220,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {recipeImagePreview ? (
                    <img
                      src={recipeImagePreview}
                      alt="Recipe preview"
                      style={{ width: "100%", maxHeight: 320, objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ padding: 24, textAlign: "center", color: "#737373", fontSize: 14 }}>
                      No image selected yet.
                      <br />
                      Upload one or generate one.
                    </div>
                  )}
                </div>

                {recipeImageFile && (
                  <div style={{ marginTop: 10, fontSize: 13, color: "#525252" }}>
                    Selected upload: {recipeImageFile.name}
                  </div>
                )}

                {generatedRecipeImageUrl && !recipeImageFile && (
                  <div style={{ marginTop: 10, fontSize: 13, color: "#166534" }}>
                    Generated image ready to save.
                  </div>
                )}

                {recipeImageError && (
                  <div style={{ marginTop: 10, fontSize: 13, color: "#b91c1c" }}>
                    {recipeImageError}
                  </div>
                )}
              </div>

              <textarea
                placeholder="Ingredients, one per line"
                value={recipeForm.ingredients}
                disabled={!canUseApp}
                onChange={(e) => setRecipeForm((prev) => ({ ...prev, ingredients: e.target.value }))}
                style={{ minHeight: 120, padding: 12, borderRadius: 12, border: "1px solid #d4d4d4" }}
              />

              <textarea
                placeholder="Method, one step per line"
                value={recipeForm.method}
                disabled={!canUseApp}
                onChange={(e) => setRecipeForm((prev) => ({ ...prev, method: e.target.value }))}
                style={{ minHeight: 140, padding: 12, borderRadius: 12, border: "1px solid #d4d4d4" }}
              />

              <button
                onClick={() => void addRecipe()}
                disabled={!canUseApp || isSavingRecipe}
                style={{
                  borderRadius: 16,
                  border: 0,
                  background: "#f97316",
                  color: "white",
                  padding: "12px 16px",
                  cursor: canUseApp ? "pointer" : "not-allowed",
                  opacity: !canUseApp || isSavingRecipe ? 0.65 : 1,
                }}
              >
                <Plus size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
                {isSavingRecipe ? "Saving…" : "Save recipe"}
              </button>
            </div>
          </div>
        )}

        {tab === "recipes" && (
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
            }}
          >
            {recipes.map((recipe) => (
              <div key={recipe.id} style={{ ...cardStyle(), overflow: "hidden" }}>
                <img src={recipe.image} alt={recipe.title} style={{ width: "100%", height: 192, objectFit: "cover" }} />
                <div style={{ paddingTop: 16 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                    <span style={badgeStyle("#f5f5f5", "#404040")}>{recipe.mealType}</span>
                    <span style={badgeStyle("#f5f5f5", "#404040")}>{recipe.cuisine}</span>
                    {freshRecipeIds.includes(recipe.id) && <span style={badgeStyle("#dcfce7", "#166534")}>New</span>}
                  </div>
                  <h4 style={{ margin: 0, fontSize: 22 }}>{recipe.title}</h4>
                  <p style={{ color: "#737373", marginTop: 8 }}>{recipe.description}</p>
                  <div style={{ display: "flex", gap: 16, color: "#737373", fontSize: 14, marginTop: 12, flexWrap: "wrap" }}>
                    <span><Clock3 size={14} style={{ verticalAlign: "middle", marginRight: 4 }} /> {recipe.prepTime + recipe.cookTime} min</span>
                    <span><Users size={14} style={{ verticalAlign: "middle", marginRight: 4 }} /> {recipe.serves}</span>
                  </div>
                  <button
                    onClick={() => setSelectedRecipeId(recipe.id)}
                    style={{ width: "100%", marginTop: 16, borderRadius: 16, border: "1px solid #fed7aa", background: "white", color: "#c2410c", padding: "10px 16px", cursor: "pointer" }}
                  >
                    View recipe
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedRecipe && (
        <div
          onClick={() => setSelectedRecipeId(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: isMobile ? "64px 8px 8px" : "72px 12px 12px",
            zIndex: 40,
            overflowY: "auto",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(880px,100%)",
              maxHeight: isMobile ? "calc(100vh - 72px)" : "calc(100vh - 84px)",
              overflow: "auto",
              borderRadius: isMobile ? 16 : 20,
              background: "white",
              border: "1px solid #fed7aa",
              padding: isMobile ? 12 : 16,
              boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 14,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  <span style={badgeStyle("#f5f5f5", "#404040")}>{selectedRecipe.mealType}</span>
                  <span style={badgeStyle("#f5f5f5", "#404040")}>{selectedRecipe.cuisine}</span>
                  {freshRecipeIds.includes(selectedRecipe.id) && <span style={badgeStyle("#dcfce7", "#166534")}>New</span>}
                  {selectedRecipe.tags.map((tag) => (
                    <span key={tag} style={badgeStyle("#f5f5f5", "#404040")}>
                      {tag}
                    </span>
                  ))}
                </div>

                <h2 style={{ margin: 0, fontSize: "clamp(24px, 5vw, 30px)", lineHeight: 1.1 }}>{selectedRecipe.title}</h2>
                <p style={{ color: "#737373", margin: "10px 0 0 0" }}>{selectedRecipe.description}</p>
              </div>

              <div style={{ display: "flex", gap: 8, flexShrink: 0, width: "100%", justifyContent: "flex-end", flexWrap: "wrap" }}>
                <label
                  style={{
                    borderRadius: 12,
                    border: "1px solid #d4d4d4",
                    background: "white",
                    padding: "10px 12px",
                    cursor: uploadingRecipeImageId === selectedRecipe.id ? "not-allowed" : "pointer",
                    opacity: uploadingRecipeImageId === selectedRecipe.id ? 0.7 : 1,
                  }}
                >
                  {uploadingRecipeImageId === selectedRecipe.id ? "Uploading…" : "Upload image"}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    disabled={uploadingRecipeImageId === selectedRecipe.id || !canUseApp}
                    onChange={(e) => void handleSelectedRecipeImageUpload(e, selectedRecipe)}
                  />
                </label>

                <button
                  onClick={() => void refreshRecipeImage(selectedRecipe)}
                  disabled={refreshingImageId === selectedRecipe.id || !canUseApp}
                  style={{
                    borderRadius: 12,
                    border: "1px solid #d4d4d4",
                    background: "white",
                    padding: "10px 12px",
                    cursor: refreshingImageId === selectedRecipe.id ? "not-allowed" : "pointer",
                    opacity: refreshingImageId === selectedRecipe.id ? 0.7 : 1,
                  }}
                >
                  {refreshingImageId === selectedRecipe.id ? "Generating…" : "Generate image"}
                </button>

                <button
                  onClick={() => setSelectedRecipeId(null)}
                  style={{
                    borderRadius: 12,
                    border: "1px solid #d4d4d4",
                    background: "white",
                    padding: "10px 12px",
                    cursor: "pointer",
                  }}
                  aria-label="Close recipe"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {selectedRecipeImageError && (
              <div style={{ marginBottom: 12, color: "#b91c1c", fontSize: 14 }}>
                {selectedRecipeImageError}
              </div>
            )}

            <img
              src={selectedRecipe.image}
              alt={selectedRecipe.title}
              style={{
                width: "100%",
                height: "clamp(180px, 34vw, 240px)",
                objectFit: "cover",
                borderRadius: 18,
                marginBottom: 20,
              }}
            />

            <div
              style={{
                display: "grid",
                gap: 20,
                gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
              }}
            >
              <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
                  <div style={{ background: "#fff7ed", borderRadius: 16, padding: 12 }}>
                    <div style={{ color: "#737373", fontSize: 14 }}>Prep</div>
                    <div style={{ fontWeight: 600 }}>{selectedRecipe.prepTime} min</div>
                  </div>
                  <div style={{ background: "#fff7ed", borderRadius: 16, padding: 12 }}>
                    <div style={{ color: "#737373", fontSize: 14 }}>Cook</div>
                    <div style={{ fontWeight: 600 }}>{selectedRecipe.cookTime} min</div>
                  </div>
                  <div style={{ background: "#fff7ed", borderRadius: 16, padding: 12 }}>
                    <div style={{ color: "#737373", fontSize: 14 }}>Serves</div>
                    <div style={{ fontWeight: 600 }}>{selectedRecipe.serves}</div>
                  </div>
                </div>

                <div style={{ border: "1px solid #bbf7d0", borderRadius: 16, padding: 16, background: "#f0fdf4" }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Balanced week support</div>
                  <div style={{ fontSize: 14, color: "#166534" }}>
                    This recipe sits inside a weekly plan designed to support balance, variety, and nutritious choices across the week.
                  </div>
                </div>

                {selectedRecipe.allergens.length > 0 && (
                  <div style={{ border: "1px solid #e5e5e5", borderRadius: 16, padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, marginBottom: 8 }}>
                      <AlertTriangle size={16} /> Allergens
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {selectedRecipe.allergens.map((allergen) => (
                        <span key={allergen} style={badgeStyle("#dc2626", "white")}>
                          {allergen}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gap: 20 }}>
                <div>
                  <h4 style={{ marginTop: 0, marginBottom: 10 }}>Ingredients</h4>
                  <div style={{ display: "grid", gap: 8 }}>
                    {selectedRecipe.ingredients.map((ingredient) => (
                      <div
                        key={ingredient}
                        style={{ background: "#fff7ed", borderRadius: 12, padding: "10px 12px", fontSize: 14 }}
                      >
                        {ingredient}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ marginTop: 0, marginBottom: 10 }}>Method</h4>
                  <ol style={{ display: "grid", gap: 12, padding: 0, margin: 0, listStyle: "none" }}>
                    {selectedRecipe.method.map((step, index) => (
                      <li key={`${selectedRecipe.id}-${index}`} style={{ display: "flex", gap: 12 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 999,
                            background: "#059669",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            fontSize: 12,
                          }}
                        >
                          {index + 1}
                        </div>
                        <p style={{ margin: 0, paddingTop: 4 }}>{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <h4 style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 0 }}>
                    <NotebookPen size={16} /> Notes
                  </h4>
                  <textarea
                    placeholder="Example: needs more salt"
                    value={selectedRecipe.note}
                    disabled={!canUseApp}
                    onChange={(e) => updateNote(selectedRecipe.id, e.target.value)}
                    style={{
                      width: "100%",
                      minHeight: 100,
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid #d4d4d4",
                      resize: "vertical",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}