# Boothmate

Boothmate is a B2B exhibition booth quote marketplace MVP. Companies create booth quote requests, contractors submit quotes, companies compare/select a contractor, and admins monitor the service state.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, RLS, RPC

## Install

```bash
npm install
```

## Environment

Create `.env.local` from `.env.example`.

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Do not commit real keys or passwords.

## Development

```bash
npm run dev
```

The local app runs at `http://localhost:3000` by default. If another server is already using that port, run `npm run dev -- -p 3001`.

## Supabase Migration Order

Run the SQL files in this order:

1. `supabase/migrations/20260624000000_phase1_foundation.sql`
2. `supabase/migrations/20260624010000_auth_roles_profiles.sql`
3. `supabase/migrations/20260624020000_exhibitions_quote_requests.sql`
4. `supabase/migrations/20260624030000_quotes.sql`
5. `supabase/migrations/20260624040000_quote_selection.sql`
6. `supabase/migrations/20260624050000_admin_mvp_stabilization.sql`

If using the Supabase SQL Editor, run each file as a complete script.

## Test Accounts

For local UI testing, use the development quick-login panel on `/login`.

For real Supabase Auth accounts, prepare separate emails for:

- company user
- contractor user
- admin user

Admin role is not assigned in the app UI. Set `profiles.role = 'admin'` manually in Supabase for the admin test account.

## Main Routes

Company:

- `/company/dashboard`
- `/company/quote-requests/new`
- `/company/quote-requests`
- `/company/quote-requests/[id]/quotes`
- `/company/quote-requests/[id]/compare`

Contractor:

- `/contractor/dashboard`
- `/contractor/quote-requests`
- `/contractor/quotes`

Admin:

- `/admin/dashboard`
- `/admin/exhibitions`
- `/admin/contractors`
- `/admin/users`
- `/admin/quote-requests`
- `/admin/quotes`

## Verification

```bash
npm run lint
npm run typecheck
npm run build
```

## Vercel Deployment

Set these Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Never expose a Supabase service role key in the browser. This MVP does not require a service role key.

## Post-Deploy Checklist

- Public home and exhibitions pages load.
- Login and signup pages load with Supabase env configured.
- Company dashboard, quote request creation, received quotes, compare, and selection flow work.
- Contractor dashboard, open requests, quote draft, quote submit, and submitted quote detail work.
- Admin dashboard and all six admin management pages are blocked for non-admin users.
- Cross-role direct URL access shows access denied or redirects to login.
- 404 page renders for unknown routes.
- Supabase RLS remains enabled on protected tables.

## Legacy Prototype

The previous static prototype is preserved in `legacy-static/` and should be used only as a design reference.
