# Delivery Proof

A mobile-first photo proof system for restaurant deliveries. Team members can sign in, capture delivery photos, record order and vendor details, and search historical deliveries without exposing records from other stores.

## Run locally

1. Copy `.env.example` to `.env` and add your Supabase project URL and publishable key.
2. Run `npm install`.
3. Run `npm run dev`.

## Production build

Run `npm run build`. The deployable site is generated in `dist/`.

## Database

Apply the SQL files in `supabase/migrations` to your Supabase project. Row-level security protects organization and store data. The photo bucket is private and images are displayed with short-lived signed URLs.
