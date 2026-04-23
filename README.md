# MealMap app scaffold

A real browser-run starter for the household meal-planning app using:
- Next.js
- Supabase
- Netlify

## 1. Install

```bash
npm install
```

## 2. Create `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 3. Run locally

```bash
npm run dev
```

## 4. Supabase setup

Run `supabase/schema.sql` in the Supabase SQL Editor.

For first testing only, disable RLS on:
- households
- household_members
- recipes
- weekly_plans
- weekly_plan_meals
- recipe_feedback
- referrals

## 5. Netlify setup

- Push this project to GitHub
- In Netlify, add a new project from Git
- Select the repo
- Build command: `npm run build`
- Publish directory: leave framework default for Next.js
- Add environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Deploy

## 6. What’s included

- marketing homepage
- browser dashboard
- household member creation
- manual recipe creation
- recipe library
- shopping list
- recipe detail modal
- Supabase-ready reads and writes
- API route scaffold for AI meal planning

## 7. Recommended next build steps

1. Add Supabase Auth
2. Create one household record per signed-in user
3. Attach members and plans to the household
4. Persist weekly planner data
5. Add OpenAI meal-planning endpoint
6. Add proper RLS policies
