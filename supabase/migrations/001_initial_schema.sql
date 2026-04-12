-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Users (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  subscription_tier text default 'free' check (subscription_tier in ('free', 'basic', 'premium')),
  monthly_credits integer default 1,
  credits_used_this_month integer default 0,
  stripe_customer_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Story themes (premade templates)
create table public.themes (
  id uuid default uuid_generate_v4() primary key,
  slug text unique not null,
  name text not null,
  description text,
  category text not null,
  age_range_min integer default 3,
  age_range_max integer default 8,
  thumbnail_url text,
  prompt_template text not null,
  page_count integer default 10,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Books (the core entity)
create table public.books (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  theme_id uuid references public.themes(id),
  title text not null,
  child_name text not null,
  child_age integer,
  child_traits text[],
  creation_mode text default 'template' check (creation_mode in ('template', 'custom')),
  custom_prompt text,
  cover_style text,
  status text default 'draft' check (status in ('draft', 'generating', 'review', 'complete', 'error')),
  is_public boolean default false,
  share_slug text unique,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Book pages
create table public.pages (
  id uuid default uuid_generate_v4() primary key,
  book_id uuid references public.books(id) on delete cascade not null,
  page_number integer not null,
  text_content text not null,
  illustration_prompt text,
  illustration_url text,
  illustration_status text default 'pending' check (illustration_status in ('pending', 'generating', 'complete', 'error')),
  animation_url text,
  narration_url text,
  narration_duration_ms integer,
  mood text,
  created_at timestamptz default now()
);

-- Cover options (3 generated per book)
create table public.cover_options (
  id uuid default uuid_generate_v4() primary key,
  book_id uuid references public.books(id) on delete cascade not null,
  style_name text not null,
  image_url text not null,
  style_prompt text not null,
  is_selected boolean default false,
  created_at timestamptz default now()
);

-- Uploaded photos
create table public.photos (
  id uuid default uuid_generate_v4() primary key,
  book_id uuid references public.books(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  storage_path text not null,
  label text,
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.pages enable row level security;
alter table public.cover_options enable row level security;
alter table public.photos enable row level security;

-- Policies: users can only access their own data
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users can CRUD own books" on public.books for all using (auth.uid() = user_id);
create policy "Public books are viewable" on public.books for select using (is_public = true);

create policy "Users can CRUD own pages" on public.pages for all
  using (book_id in (select id from public.books where user_id = auth.uid()));
create policy "Public book pages are viewable" on public.pages for select
  using (book_id in (select id from public.books where is_public = true));

create policy "Users can CRUD own covers" on public.cover_options for all
  using (book_id in (select id from public.books where user_id = auth.uid()));

create policy "Users can CRUD own photos" on public.photos for all using (auth.uid() = user_id);

-- Anyone can view active themes
create policy "Themes are viewable by all" on public.themes for select using (is_active = true);
alter table public.themes enable row level security;

-- Indexes
create index idx_books_user on public.books(user_id);
create index idx_books_share_slug on public.books(share_slug);
create index idx_pages_book on public.pages(book_id, page_number);
create index idx_covers_book on public.cover_options(book_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
