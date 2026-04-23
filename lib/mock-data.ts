import type { Recipe, HouseholdMember } from './types';

export const starterRecipes: Recipe[] = [
  {
    id: '1',
    title: 'Berry Yoghurt Bowls',
    meal_type: 'Breakfast',
    description: 'Quick breakfast bowls with berries, oats and yoghurt.',
    image_url: 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=1200&q=80',
    prep_time: 10,
    cook_time: 0,
    serves: 4,
    cuisine: 'British',
    tags: ['Vegetarian', 'Quick'],
    allergens: ['Dairy'],
    ingredients: ['500g Greek yoghurt', '200g mixed berries', '80g oats'],
    method: ['Divide yoghurt into bowls.', 'Top with berries and oats.', 'Serve immediately.'],
    note: '',
    source_type: 'manual'
  },
  {
    id: '2',
    title: 'Chicken Wrap Lunch Box',
    meal_type: 'Lunch',
    description: 'Packed lunch wraps with chicken, lettuce and yoghurt dressing.',
    image_url: 'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?auto=format&fit=crop&w=1200&q=80',
    prep_time: 12,
    cook_time: 0,
    serves: 4,
    cuisine: 'British',
    tags: ['High-protein'],
    allergens: ['Wheat', 'Dairy'],
    ingredients: ['4 wraps', '250g cooked chicken', '1 cucumber', '4 tbsp yoghurt'],
    method: ['Mix dressing.', 'Fill wraps.', 'Wrap and chill.'],
    note: '',
    source_type: 'manual'
  },
  {
    id: '3',
    title: 'Creamy Mushroom Pasta',
    meal_type: 'Dinner',
    description: 'Comforting weeknight pasta with garlic mushrooms and spinach.',
    image_url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=1200&q=80',
    prep_time: 15,
    cook_time: 20,
    serves: 4,
    cuisine: 'Italian-inspired',
    tags: ['Vegetarian', 'Family-friendly'],
    allergens: ['Dairy', 'Wheat'],
    ingredients: ['300g pasta', '250g mushrooms', '2 garlic cloves', '150ml cream'],
    method: ['Cook pasta.', 'Fry mushrooms and garlic.', 'Stir in cream.', 'Combine and season.'],
    note: '',
    source_type: 'manual'
  }
];

export const starterMembers: HouseholdMember[] = [
  { id: '1', household_id: null, name: 'Alex', age_group: 'Adult', diet: 'Vegetarian', allergies: ['Nuts'] },
  { id: '2', household_id: null, name: 'Mia', age_group: 'Child', diet: 'None', allergies: ['Shellfish'] }
];
