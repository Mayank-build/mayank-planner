# Mayank Planner

A premium dark personal planner for college, skills, gym, running, and content planning. It is responsive and installable as a PWA.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Without configuration, the planner works in local-first mode: data stays in the browser. This makes it immediately usable while you set up a private account.

## Enable private accounts and sync

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in its SQL Editor.
3. Copy `.env.example` to `.env.local` and fill the project URL and anon key.
4. In Supabase Authentication, enable Email provider and configure the site URL for local and Vercel deployments.

The database policies scope profiles, categories, and tasks to `auth.uid()`. New accounts receive a profile named Mayank; starter categories are added when they first sign in.

## Deploy

Import this directory into Vercel, add the two `NEXT_PUBLIC_SUPABASE_*` environment variables, then deploy. The included web manifest and service worker enable home-screen installation and cache the app shell for repeat/offline use.
