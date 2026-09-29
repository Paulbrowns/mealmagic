# Feed Me

A deliberately simple household meal planner.

**Promise:** Tell us what you like. Tell us what you hate. Get a month of meals.

## Product principles

- no giant recipe catalogue
- people type their own likes, favourites, dislikes and never-serve meals
- shared household meals are prioritised
- occasional split suppers are allowed when a favourite is worth the effort
- lunches default to simple soups, sandwiches and light meals
- meal banks remain editable as tastes change
- recipes are optional, not the product

## Stack

- Next.js / React PWA
- Cloudflare Workers
- Cloudflare D1
- GitHub
- OpenAI API for menu generation
- Stripe later, after the core experience is right

## Staging now

- Paul + Dee seeded as real QA data
- editable Likes / Favourites / Dislikes / Never serve
- 31-day lunch + supper view
- responsive UI
- initial D1 schema in `db/migrations/0001_initial.sql`
- Cloudflare config in `wrangler.jsonc`

## Next

1. wire Meal Bank writes to D1
2. persist households and people
3. structured OpenAI monthly generation
4. swap + lock meals
5. PWA manifest / offline shell
6. print/PDF view
