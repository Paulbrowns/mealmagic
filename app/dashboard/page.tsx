'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, RefreshCw, Share2 } from 'lucide-react';
import { Header } from '@/components/header';
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { starterMembers, starterRecipes } from '@/lib/mock-data';
import type { HouseholdMember, MealType, Recipe } from '@/lib/types';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner'];

type Planner = Record<string, Record<MealType, string>>;

function parseCsv(value: string) {
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

function buildPlanner(recipeIds: string[]): Planner {
  const [b = '', l = '', d = ''] = recipeIds;
  return Object.fromEntries(DAYS.map((day) => [day, { Breakfast: b, Lunch: l, Dinner: d }])) as Planner;
}

export default function DashboardPage() {
  const [recipes, setRecipes] = useState<Recipe[]>(starterRecipes);
  const [members, setMembers] = useState<HouseholdMember[]>(starterMembers);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [planner, setPlanner] = useState<Planner>(buildPlanner(starterRecipes.map((r) => r.id)));
  const [dataSource, setDataSource] = useState('Mock data');
  const [loading, setLoading] = useState(true);
  const [memberName, setMemberName] = useState('');
  const [memberAge, setMemberAge] = useState('Adult');
  const [memberDiet, setMemberDiet] = useState('None');
  const [memberAllergies, setMemberAllergies] = useState('');
  const [recipeTitle, setRecipeTitle] = useState('');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [recipeCuisine, setRecipeCuisine] = useState('British');
  const [recipeMealType, setRecipeMealType] = useState<MealType>('Dinner');
  const [recipeIngredients, setRecipeIngredients] = useState('');
  const [recipeMethod, setRecipeMethod] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const supabase = createBrowserSupabaseClient();

        const [recipesRes, membersRes] = await Promise.all([
          supabase.from('recipes').select('*').order('created_at', { ascending: false }),
          supabase.from('household_members').select('*').order('created_at', { ascending: true }),
        ]);

        if (!mounted) return;

        if (!recipesRes.error && recipesRes.data && recipesRes.data.length > 0) {
          setRecipes(recipesRes.data as Recipe[]);
          const ids = recipesRes.data.slice(0, 3).map((r) => r.id);
          setPlanner(buildPlanner(ids));
          setDataSource('Supabase');
        }

        if (!membersRes.error && membersRes.data && membersRes.data.length > 0) {
          setMembers(membersRes.data as HouseholdMember[]);
        }
      } catch {
        setDataSource('Mock fallback');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const recipeMap = useMemo(
    () => Object.fromEntries(recipes.map((r) => [r.id, r])) as Record<string, Recipe>,
    [recipes]
  );

  const selectedRecipe = selectedRecipeId ? recipeMap[selectedRecipeId] : null;

  const shoppingList = useMemo(() => {
    const items: string[] = [];

    Object.values(planner).forEach((dayMeals) => {
      Object.values(dayMeals).forEach((recipeId) => {
        const recipe = recipeMap[recipeId];
        if (recipe) items.push(...recipe.ingredients);
      });
    });

    return [...new Set(items)].sort();
  }, [planner, recipeMap]);

  async function addMember() {
    if (!memberName.trim()) return;

    const payload = {
      name: memberName.trim(),
      age_group: memberAge,
      diet: memberDiet,
      allergies: parseCsv(memberAllergies),
      household_id: null,
    };

    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.from('household_members').insert(payload).select().single();

      if (!error && data) {
        setMembers((prev) => [...prev, data as HouseholdMember]);
      }
    } catch {
      setMembers((prev) => [...prev, { id: String(Date.now()), ...payload } as HouseholdMember]);
    }

    setMemberName('');
    setMemberAge('Adult');
    setMemberDiet('None');
    setMemberAllergies('');
  }

  async function addRecipe() {
    if (!recipeTitle.trim()) return;

    const payload = {
      title: recipeTitle.trim(),
      description: recipeDescription.trim(),
      meal_type: recipeMealType,
      cuisine: recipeCuisine.trim() || 'British',
      image_url:
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
      prep_time: 15,
      cook_time: 20,
      serves: 4,
      tags: ['Manual recipe'],
      allergens: [],
      ingredients: recipeIngredients.split('\n').map((s) => s.trim()).filter(Boolean),
      method: recipeMethod.split('\n').map((s) => s.trim()).filter(Boolean),
      note: '',
      source_type: 'manual',
    };

    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.from('recipes').insert(payload).select().single();

      if (!error && data) {
        setRecipes((prev) => [data as Recipe, ...prev]);
      }
    } catch {
      setRecipes((prev) => [{ id: String(Date.now()), ...payload } as Recipe, ...prev]);
    }

    setRecipeTitle('');
    setRecipeDescription('');
    setRecipeCuisine('British');
    setRecipeMealType('Dinner');
    setRecipeIngredients('');
    setRecipeMethod('');
  }

  function swapMeal(day: string, mealType: MealType) {
    const currentId = planner[day][mealType];
    const options = recipes.filter((r) => r.meal_type === mealType && r.id !== currentId);
    if (options.length === 0) return;
    const next = options[Math.floor(Math.random() * options.length)];
    setPlanner((prev) => ({ ...prev, [day]: { ...prev[day], [mealType]: next.id } }));
  }

  return (
    <div>
      <Header badge={loading ? 'Loading…' : dataSource} />
      <main className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
        <div className="grid grid-2">
          <section className="card" style={{ padding: 24 }}>
            <div className="row-between">
              <div>
                <div className="small">Planner</div>
                <h2 style={{ margin: '8px 0 0' }}>This week’s menu</h2>
              </div>
              <button className="btn btn-success">Regenerate week</button>
            </div>

            <div className="section grid grid-2">
              {DAYS.map((day) => (
                <div key={day} className="card" style={{ padding: 16 }}>
                  <div className="row">
                    <CalendarDays size={16} />
                    <strong>{day}</strong>
                  </div>

                  <div className="list" style={{ marginTop: 14 }}>
                    {MEAL_TYPES.map((mealType) => {
                      const recipe = recipeMap[planner[day][mealType]];
                      if (!recipe) return null;

                      return (
                        <div key={`${day}-${mealType}`} className="meal-card">
                          <div className="row-between" style={{ alignItems: 'flex-start' }}>
                            <div>
                              <div className="badge">{mealType}</div>
                              <div style={{ fontWeight: 700, marginTop: 8 }}>{recipe.title}</div>
                              <div className="small" style={{ marginTop: 4 }}>
                                {recipe.description}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                            <button
                              className="btn btn-secondary"
                              onClick={() => setSelectedRecipeId(recipe.id)}
                            >
                              Open
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={() => swapMeal(day, mealType)}
                            >
                              <RefreshCw size={16} /> Replace
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid">
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ marginTop: 0 }}>Shopping list</h3>
              <div className="list">
                {shoppingList.map((item) => (
                  <label
                    key={item}
                    className="row-between"
                    style={{ padding: 12, borderRadius: 14, background: '#fff7ed' }}
                  >
                    <span>{item}</span>
                    <input type="checkbox" />
                  </label>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <div className="row">
                <Share2 size={18} />
                <h3 style={{ margin: 0 }}>Tell a friend</h3>
              </div>
              <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: '#fff7ed' }}>
                mealmap.app/invite/alex-household
              </div>
            </div>
          </section>
        </div>

        <section className="section grid grid-2">
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ marginTop: 0 }}>Add household member</h3>
            <div className="list">
              <input
                className="input"
                placeholder="Name"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
              />
              <select className="select" value={memberAge} onChange={(e) => setMemberAge(e.target.value)}>
                <option>Adult</option>
                <option>Teenager</option>
                <option>Child</option>
                <option>Toddler</option>
              </select>
              <select className="select" value={memberDiet} onChange={(e) => setMemberDiet(e.target.value)}>
                <option>None</option>
                <option>Vegetarian</option>
                <option>Vegan</option>
                <option>Gluten-free</option>
              </select>
              <input
                className="input"
                placeholder="Allergies, comma separated"
                value={memberAllergies}
                onChange={(e) => setMemberAllergies(e.target.value)}
              />
              <button className="btn btn-success" onClick={addMember}>
                Add member
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ marginTop: 0 }}>Household members</h3>
            <div className="grid grid-2">
              {members.map((member) => (
                <div key={member.id} className="card" style={{ padding: 16 }}>
                  <div className="row-between">
                    <strong>{member.name}</strong>
                    <span className="pill">{member.age_group}</span>
                  </div>
                  <div className="small" style={{ marginTop: 8 }}>
                    Diet: {member.diet}
                  </div>
                  <div className="small">Allergies: {member.allergies.join(', ') || 'None'}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section grid grid-2">
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ marginTop: 0 }}>Manually add a recipe</h3>
            <div className="list">
              <input
                className="input"
                placeholder="Recipe title"
                value={recipeTitle}
                onChange={(e) => setRecipeTitle(e.target.value)}
              />
              <textarea
                className="textarea"
                placeholder="Brief description"
                value={recipeDescription}
                onChange={(e) => setRecipeDescription(e.target.value)}
              />
              <select
                className="select"
                value={recipeMealType}
                onChange={(e) => setRecipeMealType(e.target.value as MealType)}
              >
                <option>Breakfast</option>
                <option>Lunch</option>
                <option>Dinner</option>
              </select>
              <input
                className="input"
                placeholder="Cuisine"
                value={recipeCuisine}
                onChange={(e) => setRecipeCuisine(e.target.value)}
              />
              <textarea
                className="textarea"
                placeholder="Ingredients, one per line"
                value={recipeIngredients}
                onChange={(e) => setRecipeIngredients(e.target.value)}
              />
              <textarea
                className="textarea"
                placeholder="Method, one step per line"
                value={recipeMethod}
                onChange={(e) => setRecipeMethod(e.target.value)}
              />
              <button className="btn btn-primary" onClick={addRecipe}>
                Save recipe
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ marginTop: 0 }}>Recipe library</h3>
            <div className="grid grid-2">
              {recipes.map((recipe) => (
                <div key={recipe.id} className="card" style={{ overflow: 'hidden' }}>
                  <img
                    src={recipe.image_url}
                    alt={recipe.title}
                    style={{ height: 180, width: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ padding: 16 }}>
                    <div className="row" style={{ flexWrap: 'wrap' }}>
                      <span className="pill">{recipe.meal_type}</span>
                      <span className="pill">{recipe.cuisine}</span>
                    </div>
                    <div style={{ fontWeight: 700, marginTop: 10 }}>{recipe.title}</div>
                    <div className="small" style={{ marginTop: 6 }}>{recipe.description}</div>
                    <button
                      className="btn btn-secondary"
                      style={{ marginTop: 12 }}
                      onClick={() => setSelectedRecipeId(recipe.id)}
                    >
                      View recipe
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {selectedRecipe && (
        <div className="dialog-backdrop" onClick={() => setSelectedRecipeId(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="row-between">
              <div>
                <h2 style={{ margin: 0 }}>{selectedRecipe.title}</h2>
                <div className="small">{selectedRecipe.description}</div>
              </div>
              <button className="btn btn-secondary" onClick={() => setSelectedRecipeId(null)}>
                Close
              </button>
            </div>

            <img
              src={selectedRecipe.image_url}
              alt={selectedRecipe.title}
              style={{
                marginTop: 16,
                borderRadius: 20,
                height: 280,
                width: '100%',
                objectFit: 'cover',
              }}
            />

            <div className="grid grid-2 section">
              <div>
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  <span className="pill">{selectedRecipe.meal_type}</span>
                  <span className="pill">{selectedRecipe.cuisine}</span>
                  {selectedRecipe.tags.map((tag) => (
                    <span className="pill" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="grid grid-3" style={{ marginTop: 16 }}>
                  <div className="card" style={{ padding: 12 }}>
                    <div className="small">Prep</div>
                    <strong>{selectedRecipe.prep_time} min</strong>
                  </div>
                  <div className="card" style={{ padding: 12 }}>
                    <div className="small">Cook</div>
                    <strong>{selectedRecipe.cook_time} min</strong>
                  </div>
                  <div className="card" style={{ padding: 12 }}>
                    <div className="small">Serves</div>
                    <strong>{selectedRecipe.serves}</strong>
                  </div>
                </div>

                {selectedRecipe.allergens.length > 0 && (
                  <div className="card" style={{ padding: 16, marginTop: 16 }}>
                    <div className="row">
                      <AlertTriangle size={16} />
                      <strong>Allergens</strong>
                    </div>
                    <div className="row" style={{ flexWrap: 'wrap', marginTop: 8 }}>
                      {selectedRecipe.allergens.map((allergen) => (
                        <span key={allergen} className="pill">
                          {allergen}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3>Ingredients</h3>
                <div className="list">
                  {selectedRecipe.ingredients.map((ingredient) => (
                    <div key={ingredient} className="pill" style={{ width: 'fit-content' }}>
                      {ingredient}
                    </div>
                  ))}
                </div>

                <h3 style={{ marginTop: 20 }}>Method</h3>
                <ol className="list">
                  {selectedRecipe.method.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}