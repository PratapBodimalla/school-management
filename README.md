This project implements a simple landing page for Sloka School Management with Supabase authentication and role storage.

## Getting Started

1) Install dependencies

```bash
npm i
```

2) Configure environment variables in `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3) Create the `users` table in Supabase (SQL)

```sql
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  role text not null check (role in ('Admin','Teacher','Student')),
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can insert own profile" on public.users
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);
```

4) Run the development server

```bash
npm run dev
```

Open http://localhost:3000 to view the landing page.
