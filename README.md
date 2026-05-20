This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Supabase migration & environment

Required environment variables:

- `SUPABASE_URL` — your Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (server-only, used for migration). Keep secret.
- `SUPABASE_ANON_KEY` — anon/public key (optional for client usage).
- `NEXT_PUBLIC_SUPABASE_URL` — (for Next.js client) same as `SUPABASE_URL`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — (for Next.js client) public anon key.

Local migration steps:

1. Create a Supabase project and create tables `patients` and `diets` matching the schema in `src/lib/db.ts`.
2. Set environment variables and run the migration script:

```bash
SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_service_key node scripts/migrate-sqlite-to-supabase.js
```

This script will copy rows from `data/diet-studio.db` into your Supabase Postgres tables.

After migration, set the following env vars in Vercel:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

If you need the PDF generation to work on Vercel, host the Puppeteer-based service separately and set `PDF_SERVICE_URL` and `PDF_SERVICE_KEY`.

Direct Postgres migration (no supabase-js)

If you prefer to migrate by connecting directly to the Postgres database (using the DB connection string), you can use the included script `scripts/migrate-sqlite-to-postgres.js`.

Example:

```bash
DATABASE_URL="postgresql://postgres:password@host:5432/postgres" node scripts/migrate-sqlite-to-postgres.js
```

This connects directly to Postgres and inserts rows into `patients` and `diets`.
