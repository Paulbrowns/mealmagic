import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";

type RecipePayload = {
  id?: string;
  title: string;
  mealType: "Breakfast" | "Lunch" | "Dinner";
  description?: string;
  cuisine?: string;
  tags?: string[];
  ingredients?: string[];
};

function buildRecipeImagePrompt(recipe: RecipePayload) {
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

async function generateRecipeImage(
  recipe: RecipePayload,
  openai: OpenAI,
  supabase: SupabaseClient | null
): Promise<string> {
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

    const storageId = recipe.id || crypto.randomUUID();
    const filePath = `ai/${storageId}.png`;
    const fileBuffer = Buffer.from(imageBase64, "base64");

    const { error: uploadError } = await supabase.storage
      .from("recipe-images")
      .upload(filePath, fileBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("recipe-image upload error:", uploadError);
      return `data:image/png;base64,${imageBase64}`;
    }

    const { data: publicUrlData } = supabase.storage
      .from("recipe-images")
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl || `data:image/png;base64,${imageBase64}`;
  } catch (error) {
    console.error("recipe-image generate error:", error);
    return FALLBACK_IMAGE;
  }
}

export async function POST(request: NextRequest) {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "Recipe image generation is not enabled yet." },
        { status: 501 }
      );
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    const supabase: SupabaseClient | null =
      supabaseUrl && supabaseServiceRoleKey
        ? createClient(supabaseUrl, supabaseServiceRoleKey)
        : null;

    const body = await request.json();
    const recipe = body?.recipe as RecipePayload | undefined;

    if (!recipe?.title || !recipe?.mealType) {
      return NextResponse.json({ error: "Missing recipe data" }, { status: 400 });
    }

    const imageUrl = await generateRecipeImage(recipe, openai, supabase);

    if (supabase && recipe.id) {
      const { error } = await supabase
        .from("recipes")
        .update({ image_url: imageUrl })
        .eq("id", recipe.id);

      if (error) {
        console.error("recipe-image db update error:", error);
      }
    }

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error("recipe-image route error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to refresh recipe image" },
      { status: 500 }
    );
  }
}
