import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
    : null;

type MealType = "Breakfast" | "Lunch" | "Dinner";

type Recipe = {
  id: string;
  title: string;
  mealType: MealType;
  description?: string;
  image?: string;
  prepTime?: number;
  cookTime?: number;
  serves?: number;
  cuisine?: string;
  tags?: string[];
  allergens?: string[];
  ingredients?: string[];
  method?: string[];
  note?: string;
};

type Member = {
  name?: string;
  ageGroup?: string;
  dietTypes?: string[];
  allergies?: string[];
  cuisines?: string[];
};

type Planner = Record<string, Record<MealType, string>>;

type PlannerInsights = {
  nutritionSummary: string;
  seasonalSummary: string;
  balanceHighlights: string[];
  seasonalIngredients: string[];
  weeklyCookingNotes: string[];
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner"];
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";

const FRESH_RECIPE_TARGETS: Record<MealType, number> = {
  Breakfast: 1,
  Lunch: 1,
  Dinner: 2,
};

const SEASONAL_INGREDIENT_KEYWORDS = [
  "berries",
  "berry",
  "tomato",
  "tomatoes",
  "cucumber",
  "spinach",
  "mushroom",
  "mushrooms",
  "courgette",
  "pepper",
  "peppers",
  "carrot",
  "carrots",
  "potato",
  "potatoes",
  "apple",
  "apples",
  "lemon",
  "lime",
  "herbs",
  "basil",
  "oregano",
];

function normalize(values: string[] = []) {
  return values.map((v) => v.toLowerCase().trim()).filter(Boolean);
}

function getHouseholdCuisinePreferences(members: Member[]) {
  return [...new Set(members.flatMap((m) => normalize(m.cuisines ?? [])))];
}

function recipeMatchesHousehold(recipe: Recipe, members: Member[]) {
  const tags = normalize(recipe.tags);
  const allergens = normalize(recipe.allergens);

  for (const member of members) {
    const dietTypes = normalize(member.dietTypes);
    const memberAllergies = normalize(member.allergies);

    if (memberAllergies.some((a) => allergens.includes(a))) return false;

    if (dietTypes.includes("vegetarian") && !tags.includes("vegetarian")) return false;
    if (dietTypes.includes("vegan") && !tags.includes("vegan")) return false;
    if (dietTypes.includes("gluten-free") && (allergens.includes("gluten") || allergens.includes("wheat"))) return false;
    if (dietTypes.includes("dairy-free") && allergens.includes("dairy")) return false;
  }

  return true;
}

function cuisinePreferenceScore(recipe: Recipe, preferredCuisines: string[]) {
  if (!preferredCuisines.length) return 0;

  const cuisine = (recipe.cuisine ?? "").toLowerCase().trim();
  if (!cuisine) return 0;

  if (preferredCuisines.includes(cuisine)) return 3;

  if (preferredCuisines.some((pref) => cuisine.includes(pref) || pref.includes(cuisine))) {
    return 2;
  }

  return 0;
}

function dietPreferenceScore(recipe: Recipe, members: Member[]) {
  const tags = normalize(recipe.tags);
  let score = 0;

  for (const member of members) {
    const diets = normalize(member.dietTypes);

    if (diets.includes("high-protein") && tags.includes("high-protein")) score += 2;
    if (diets.includes("low-fat") && tags.includes("low-fat")) score += 2;
    if (diets.includes("low-carb") && tags.includes("low-carb")) score += 2;
    if (diets.includes("mediterranean") && tags.includes("mediterranean")) score += 2;
    if (diets.includes("pescatarian") && tags.includes("pescatarian")) score += 2;
  }

  return score;
}

function freshnessScore(recipe: Recipe, freshIds: Set<string>) {
  return freshIds.has(recipe.id) ? 6 : 0;
}

function shortlistRecipes(recipes: Recipe[], members: Member[], mealType: MealType, freshIds?: Set<string>) {
  const preferredCuisines = getHouseholdCuisinePreferences(members);

  return recipes
    .filter((recipe) => recipe.mealType === mealType && recipeMatchesHousehold(recipe, members))
    .sort((a, b) => {
      const bScore =
        cuisinePreferenceScore(b, preferredCuisines) +
        dietPreferenceScore(b, members) +
        freshnessScore(b, freshIds ?? new Set());
      const aScore =
        cuisinePreferenceScore(a, preferredCuisines) +
        dietPreferenceScore(a, members) +
        freshnessScore(a, freshIds ?? new Set());
      return bScore - aScore;
    });
}

function buildFallbackPlanner(
  recipes: Recipe[],
  members: Member[],
  useLeftovers: boolean,
  freshIds?: Set<string>
): Planner {
  const planner = {} as Planner;
  const usedIds = new Set<string>();
  const preferredCuisines = getHouseholdCuisinePreferences(members);

  for (const day of DAYS) {
    planner[day] = {} as Record<MealType, string>;

    for (const mealType of MEAL_TYPES) {
      const pool = shortlistRecipes(recipes, members, mealType, freshIds);
      const candidates = pool.length > 0 ? pool : recipes.filter((r) => r.mealType === mealType);

      const sorted = [...candidates].sort((a, b) => {
        const bScore =
          cuisinePreferenceScore(b, preferredCuisines) +
          dietPreferenceScore(b, members) +
          freshnessScore(b, freshIds ?? new Set());
        const aScore =
          cuisinePreferenceScore(a, preferredCuisines) +
          dietPreferenceScore(a, members) +
          freshnessScore(a, freshIds ?? new Set());
        return bScore - aScore;
      });

      const chosen =
        sorted.find((r) => !usedIds.has(r.id)) ??
        (useLeftovers ? sorted.find((r) => usedIds.has(r.id)) : undefined) ??
        sorted[0];

      if (!chosen) throw new Error(`No ${mealType} recipes available`);

      planner[day][mealType] = chosen.id;
      usedIds.add(chosen.id);
    }
  }

  return planner;
}

function isValidPlanner(value: unknown, recipes: Recipe[]): value is Planner {
  if (!value || typeof value !== "object") return false;

  const ids = new Set(recipes.map((r) => r.id));
  const obj = value as Record<string, Record<string, string>>;

  for (const day of DAYS) {
    if (!obj[day] || typeof obj[day] !== "object") return false;
    for (const mealType of MEAL_TYPES) {
      const recipeId = obj[day][mealType];
      if (typeof recipeId !== "string") return false;
      if (!ids.has(recipeId)) return false;
    }
  }

  return true;
}

function buildRecipeImagePrompt(recipe: Recipe) {
  const ingredients = (recipe.ingredients ?? []).slice(0, 8).join(", ");
  const tags = (recipe.tags ?? []).slice(0, 6).join(", ");

  return `
Create a realistic appetising food photograph of this dish.

Dish: ${recipe.title}
Meal type: ${recipe.mealType}
Cuisine: ${recipe.cuisine ?? "British"}
Description: ${recipe.description ?? ""}
Key ingredients: ${ingredients}
Style tags: ${tags}

Requirements:
- Show the finished plated dish only
- Make it look like a real home-cooked meal
- No text, labels, packaging, logos, or watermarks
- No collage, no split-screen, no multiple dishes unless the recipe naturally serves as a bowl or tray meal
- Natural lighting, clean background, modern food photography
- The image must closely match the dish title and ingredients
`.trim();
}

async function generateRecipeImage(recipe: Recipe): Promise<string> {
  try {
    const imageResponse = await openai.images.generate({
      model: "gpt-image-1",
      prompt: buildRecipeImagePrompt(recipe),
      size: "1024x1024",
      quality: "medium",
    });

    const imageBase64 = imageResponse.data?.[0]?.b64_json;
    if (!imageBase64) return FALLBACK_IMAGE;

    if (!supabase) {
      return `data:image/png;base64,${imageBase64}`;
    }

    const filePath = `ai/${recipe.id}.png`;
    const fileBuffer = Buffer.from(imageBase64, "base64");

    const { error: uploadError } = await supabase.storage
      .from("recipe-images")
      .upload(filePath, fileBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("generateRecipeImage upload error:", uploadError);
      return `data:image/png;base64,${imageBase64}`;
    }

    const { data: publicUrlData } = supabase.storage
      .from("recipe-images")
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl || `data:image/png;base64,${imageBase64}`;
  } catch (error) {
    console.error("generateRecipeImage error:", error);
    return FALLBACK_IMAGE;
  }
}

async function generateRecipesForMealType(mealType: MealType, members: Member[], count: number) {
  const preferredCuisines = getHouseholdCuisinePreferences(members);

  const prompt = `
Generate ${count} household-friendly ${mealType} recipes for UK users.

Return ONLY valid JSON as an array.
Each item must look exactly like:
{
  "title": "Recipe title",
  "mealType": "${mealType}",
  "description": "Short appealing description",
  "prepTime": 15,
  "cookTime": 20,
  "serves": 4,
  "cuisine": "British",
  "tags": ["Vegetarian"],
  "allergens": [],
  "ingredients": ["item 1", "item 2"],
  "method": ["step 1", "step 2"],
  "note": ""
}

Rules:
- Must suit this household as closely as possible.
- Use the household's preferred cuisines where reasonable.
- Respect household diet types where possible.
- Do not include allergens that conflict with the household.
- Aim for a balanced and varied week overall.
- Prefer recipes that use wholesome ingredients and seasonal produce where reasonable.
- Use realistic ingredients and method steps.
- Use a valid mealType exactly equal to "${mealType}".
- Do not include an image field.
- Make the recipes noticeably different from each other.
- Output JSON only.

Household:
${JSON.stringify(members, null, 2)}

Preferred cuisines:
${JSON.stringify(preferredCuisines, null, 2)}
`.trim();

  const response = await openai.responses.create({
    model: "gpt-5.4-mini",
    input: prompt,
  });

  const text = response.output_text?.trim();
  if (!text) return [];

  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) return [];

  const recipesWithoutImages = parsed
    .filter((r) => r && typeof r.title === "string")
    .map((r) => ({
      id: crypto.randomUUID(),
      title: r.title,
      mealType,
      description: r.description ?? "",
      image: "",
      prepTime: Number(r.prepTime ?? 15),
      cookTime: Number(r.cookTime ?? 20),
      serves: Number(r.serves ?? 4),
      cuisine: r.cuisine ?? "British",
      tags: Array.isArray(r.tags) ? r.tags : [],
      allergens: Array.isArray(r.allergens) ? r.allergens : [],
      ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
      method: Array.isArray(r.method) ? r.method : [],
      note: "",
    })) as Recipe[];

  const recipesWithImages = await Promise.all(
    recipesWithoutImages.map(async (recipe) => {
      const image = await generateRecipeImage(recipe);
      return { ...recipe, image };
    })
  );

  return recipesWithImages;
}

async function saveGeneratedRecipes(recipes: Recipe[]) {
  if (!supabase || recipes.length === 0) return;

  await supabase.from("recipes").insert(
    recipes.map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description ?? "",
      meal_type: recipe.mealType,
      image_url: recipe.image ?? "",
      prep_time: recipe.prepTime ?? 15,
      cook_time: recipe.cookTime ?? 20,
      serves: recipe.serves ?? 4,
      cuisine: recipe.cuisine ?? "British",
      tags: recipe.tags ?? [],
      allergens: recipe.allergens ?? [],
      ingredients: recipe.ingredients ?? [],
      method: recipe.method ?? [],
      note: recipe.note ?? "",
      source_type: "ai_generated",
      recipe_status: "approved",
      approved_for_planning: true,
      created_by: null,
    }))
  );
}

function clonePlanner(planner: Planner): Planner {
  return JSON.parse(JSON.stringify(planner));
}

function ensureFreshRecipesInPlanner(
  planner: Planner,
  freshRecipesByMealType: Record<MealType, Recipe[]>
): Planner {
  const nextPlanner = clonePlanner(planner);

  for (const mealType of MEAL_TYPES) {
    const freshRecipes = freshRecipesByMealType[mealType] ?? [];
    if (freshRecipes.length === 0) continue;

    const existingIds = new Set(
      DAYS.map((day) => nextPlanner[day][mealType]).filter(Boolean)
    );

    const missingFreshRecipes = freshRecipes.filter((recipe) => !existingIds.has(recipe.id));
    if (missingFreshRecipes.length === 0) continue;

    let dayIndex = 0;

    for (const freshRecipe of missingFreshRecipes) {
      while (
        dayIndex < DAYS.length &&
        freshRecipes.some((recipe) => nextPlanner[DAYS[dayIndex]][mealType] === recipe.id)
      ) {
        dayIndex += 1;
      }

      if (dayIndex >= DAYS.length) break;

      nextPlanner[DAYS[dayIndex]][mealType] = freshRecipe.id;
      dayIndex += 1;
    }
  }

  return nextPlanner;
}

function collectPlanRecipes(planner: Planner, recipeMap: Map<string, Recipe>) {
  const used: Recipe[] = [];

  for (const day of DAYS) {
    for (const mealType of MEAL_TYPES) {
      const recipeId = planner[day]?.[mealType];
      if (!recipeId) continue;
      const recipe = recipeMap.get(recipeId);
      if (recipe) used.push(recipe);
    }
  }

  return used;
}

function buildPlannerInsights(planner: Planner, recipes: Recipe[]): PlannerInsights {
  const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const plannedRecipes = collectPlanRecipes(planner, recipeMap);

  const ingredientPool = plannedRecipes.flatMap((recipe) => normalize(recipe.ingredients ?? []));
  const tagPool = plannedRecipes.flatMap((recipe) => normalize(recipe.tags ?? []));
  const cuisines = [...new Set(plannedRecipes.map((recipe) => recipe.cuisine).filter(Boolean))];

  const seasonalIngredients = [...new Set(
    ingredientPool
      .filter((ingredient) =>
        SEASONAL_INGREDIENT_KEYWORDS.some((keyword) => ingredient.includes(keyword))
      )
      .map((ingredient) => ingredient.replace(/\b\w/g, (char) => char.toUpperCase()))
  )].slice(0, 6);

  const breakfastCount = plannedRecipes.filter((recipe) => recipe.mealType === "Breakfast").length;
  const lunchCount = plannedRecipes.filter((recipe) => recipe.mealType === "Lunch").length;
  const dinnerCount = plannedRecipes.filter((recipe) => recipe.mealType === "Dinner").length;

  const balanceHighlights: string[] = [];
  if (breakfastCount > 0) balanceHighlights.push("Breakfast, lunch and dinner are planned across the full week.");
  if (tagPool.some((tag) => tag.includes("vegetarian") || tag.includes("vegan"))) {
    balanceHighlights.push("The week includes lighter plant-based meals to support variety.");
  }
  if (tagPool.some((tag) => tag.includes("high-protein"))) {
    balanceHighlights.push("Higher-protein options are included to help keep meals filling and balanced.");
  }
  if (cuisines.length >= 3) {
    balanceHighlights.push("The plan uses a mix of cuisines to keep the week varied and interesting.");
  }
  if (seasonalIngredients.length > 0) {
    balanceHighlights.push("Seasonal produce appears across the week to keep meals fresh and practical.");
  }

  const weeklyCookingNotes = [
    "Meals are selected to support a balanced and nutritious weekly routine.",
    useSentenceCase(
      cuisines.length > 0
        ? `Cuisine variety this week includes ${cuisines.slice(0, 4).join(", ")}.`
        : "The plan keeps variety across the week."
    ),
    seasonalIngredients.length > 0
      ? `Seasonal ingredients featured this week include ${seasonalIngredients.slice(0, 4).join(", ")}.`
      : "Seasonal produce is used where it fits naturally with the plan.",
  ];

  return {
    nutritionSummary:
      "This weekly plan is designed to support a balanced and nutritious diet through variety across meals, cuisines and ingredient choices.",
    seasonalSummary:
      seasonalIngredients.length > 0
        ? `Seasonal produce is encouraged in this plan, including ${seasonalIngredients.slice(0, 4).join(", ")}.`
        : "Seasonal produce is encouraged where it fits naturally with the household's meals.",
    balanceHighlights: balanceHighlights.slice(0, 4),
    seasonalIngredients,
    weeklyCookingNotes,
  };
}

function useSentenceCase(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const recipes: Recipe[] = Array.isArray(body.recipes) ? body.recipes : [];
    const members: Member[] = Array.isArray(body.members) ? body.members : [];
    const useLeftovers = Boolean(body.useLeftovers);

    let workingRecipes = [...recipes];
    const freshIds = new Set<string>();
    const freshRecipesByMealType: Record<MealType, Recipe[]> = {
      Breakfast: [],
      Lunch: [],
      Dinner: [],
    };

    for (const mealType of MEAL_TYPES) {
      const targetCount = FRESH_RECIPE_TARGETS[mealType];
      const generated = await generateRecipesForMealType(mealType, members, targetCount);
      const filtered = generated.filter((recipe) => recipeMatchesHousehold(recipe, members));

      if (filtered.length > 0) {
        await saveGeneratedRecipes(filtered);
        workingRecipes = [...workingRecipes, ...filtered];
        filtered.forEach((recipe) => freshIds.add(recipe.id));
        freshRecipesByMealType[mealType] = filtered;
      }
    }

    const breakfast = shortlistRecipes(workingRecipes, members, "Breakfast", freshIds);
    const lunch = shortlistRecipes(workingRecipes, members, "Lunch", freshIds);
    const dinner = shortlistRecipes(workingRecipes, members, "Dinner", freshIds);
    const preferredCuisines = getHouseholdCuisinePreferences(members);

    const catalog = {
      Breakfast: breakfast.map((r) => ({
        id: r.id,
        title: r.title,
        cuisine: r.cuisine ?? "",
        tags: r.tags ?? [],
        allergens: r.allergens ?? [],
        isFresh: freshIds.has(r.id),
      })),
      Lunch: lunch.map((r) => ({
        id: r.id,
        title: r.title,
        cuisine: r.cuisine ?? "",
        tags: r.tags ?? [],
        allergens: r.allergens ?? [],
        isFresh: freshIds.has(r.id),
      })),
      Dinner: dinner.map((r) => ({
        id: r.id,
        title: r.title,
        cuisine: r.cuisine ?? "",
        tags: r.tags ?? [],
        allergens: r.allergens ?? [],
        isFresh: freshIds.has(r.id),
      })),
    };

    const prompt = `
You are building a 7-day household meal plan from an existing recipe database.

Return ONLY valid JSON in this exact shape:
{
  "Monday": { "Breakfast": "recipe_id", "Lunch": "recipe_id", "Dinner": "recipe_id" },
  "Tuesday": { "Breakfast": "recipe_id", "Lunch": "recipe_id", "Dinner": "recipe_id" },
  "Wednesday": { "Breakfast": "recipe_id", "Lunch": "recipe_id", "Dinner": "recipe_id" },
  "Thursday": { "Breakfast": "recipe_id", "Lunch": "recipe_id", "Dinner": "recipe_id" },
  "Friday": { "Breakfast": "recipe_id", "Lunch": "recipe_id", "Dinner": "recipe_id" },
  "Saturday": { "Breakfast": "recipe_id", "Lunch": "recipe_id", "Dinner": "recipe_id" },
  "Sunday": { "Breakfast": "recipe_id", "Lunch": "recipe_id", "Dinner": "recipe_id" }
}

Rules:
- Use only provided recipe IDs.
- Match Breakfast/Lunch/Dinner correctly.
- Respect allergies and diet types.
- Prefer household cuisine preferences when possible.
- Prefer variety across the week.
- Freshly generated recipes are strongly preferred for this plan.
- Aim for a weekly plan that feels balanced and nutritious overall.
- Prefer meals using seasonal produce where reasonable.
- If useLeftovers is true, some repetition is okay.
- Output JSON only.

Household:
${JSON.stringify(members, null, 2)}

Preferred cuisines:
${JSON.stringify(preferredCuisines, null, 2)}

useLeftovers:
${JSON.stringify(useLeftovers)}

Catalog:
${JSON.stringify(catalog, null, 2)}
`.trim();

    const response = await openai.responses.create({
      model: "gpt-5.4-mini",
      input: prompt,
    });

    const text = response.output_text?.trim();

    const parsedPlanner =
      text && isValidPlanner(JSON.parse(text), workingRecipes)
        ? (JSON.parse(text) as Planner)
        : null;

    const basePlanner =
      parsedPlanner ?? buildFallbackPlanner(workingRecipes, members, useLeftovers, freshIds);

    const finalPlanner = ensureFreshRecipesInPlanner(basePlanner, freshRecipesByMealType);
    const insights = buildPlannerInsights(finalPlanner, workingRecipes);

    return NextResponse.json({
      planner: finalPlanner,
      freshRecipeIds: [...freshIds],
      generatedRecipes: Object.values(freshRecipesByMealType).flat(),
      insights,
    });
  } catch (error: any) {
    console.error("meal-plan route error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate plan" },
      { status: 500 }
    );
  }
}