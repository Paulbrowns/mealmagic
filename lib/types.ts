export type MealType = 'Breakfast' | 'Lunch' | 'Dinner';

export type Recipe = {
  id: string;
  title: string;
  description: string;
  meal_type: MealType;
  cuisine: string;
  image_url: string;
  prep_time: number;
  cook_time: number;
  serves: number;
  tags: string[];
  allergens: string[];
  ingredients: string[];
  method: string[];
  note: string;
  source_type: string;
};

export type HouseholdMember = {
  id: string;
  household_id: string | null;
  name: string;
  age_group: string;
  diet: string;
  allergies: string[];
  cuisines?: string[];
  loves?: string[];
  hates?: string[];
};
