# University Management System (Supabase)

A university management system with three portals — **Admin**, **Teacher**, **Student** —
built with plain HTML/CSS/JS and Supabase (Postgres + Auth). No build step.

## Features
- **No public sign-up.** Only the Admin can create accounts (Teacher or Student).
- **Admin portal**: dashboard, create/edit/delete Teacher & Student accounts, manage all
  students, teachers, courses and enrollments.
- **Teacher portal**: view students, courses, enrollments; edit own profile. Read-only
  everywhere else.
- **Student portal**: view own profile, available courses, and own enrollments only.
  Read-only everywhere.
- All permissions are enforced in the database via Row Level Security (RLS) — not just
  hidden in the UI.

## ⚠️ Security note (read this)
The Admin portal creates logins using Supabase's **service_role** ("secret") key, which
bypasses all Row Level Security. Because this is a static site with no backend server,
that key has to live in the browser's JS (see `js/supabase-config.js`). Anyone who views
that file's source can extract the key and get full database access.

**This is acceptable for a class assignment / local demo, but do not deploy this build
of the admin page to a public URL.** A real production version would move user-creation
behind a Supabase Edge Function so the secret key never reaches the browser.

## Setup

### 1. Create a Supabase project
Go to https://supabase.com, sign in, **New project**, give it a name, set a database
password, pick a region, create it.

### 2. Reset/create the database
Open **SQL Editor > New query** and run the block below. If you already ran SQL from an
earlier version of this app, this **drops those old tables first** — you'll lose any test
data you added, which is fine since we're moving to the new 3-role schema.

```sql
-- clean slate (safe even if these don't exist yet)
drop table if exists enrollments cascade;
drop table if exists students cascade;
drop table if exists teachers cascade;
drop table if exists courses cascade;
drop table if exists profiles cascade;
drop function if exists public.handle_new_user cascade;
drop function if exists public.is_admin cascade;

create extension if not exists "pgcrypto";

-- one row per login, holds role + display info
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null check (role in ('admin', 'teacher', 'student')),
  created_at timestamptz default now()
);

create table students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references profiles(id) on delete cascade,
  student_number text,
  department text,
  created_at timestamptz default now()
);

create table teachers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references profiles(id) on delete cascade,
  department text,
  title text,
  created_at timestamptz default now()
);

create table courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  credits int not null,
  instructor text not null,
  created_at timestamptz default now()
);

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  course_id uuid references courses(id) on delete cascade,
  student_name text not null,
  course_name text not null,
  enrolled_at timestamptz default now()
);

alter table profiles enable row level security;
alter table students enable row level security;
alter table teachers enable row level security;
alter table courses enable row level security;
alter table enrollments enable row level security;

create or replace function public.current_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function public.is_admin()
returns boolean as $$
  select public.current_role() = 'admin';
$$ language sql security definer stable;

create or replace function public.is_teacher()
returns boolean as $$
  select public.current_role() = 'teacher';
$$ language sql security definer stable;

-- non-admins can never change their own role or email, even via a direct API call
create or replace function public.protect_profile_fields()
returns trigger as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.email := old.email;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger protect_profile_fields_trigger
  before update on profiles
  for each row execute procedure public.protect_profile_fields();

-- profiles: admin/teacher can read everyone (needed so the Students/Teachers
-- pages can join names+emails), everyone can read/edit their own row
create policy "Admin/teacher view all, others view own" on profiles
  for select using (public.is_admin() or public.is_teacher() or id = auth.uid());
create policy "Admin can insert profiles" on profiles
  for insert with check (public.is_admin());
create policy "Update own or admin updates all" on profiles
  for update using (public.is_admin() or id = auth.uid()) with check (public.is_admin() or id = auth.uid());
create policy "Admin can delete profiles" on profiles
  for delete using (public.is_admin());

-- students: admin full access, teacher read-only, student reads own row only
create policy "Admin and teacher can view students" on students
  for select using (public.is_admin() or public.is_teacher() or profile_id = auth.uid());
create policy "Admin manages students" on students
  for insert with check (public.is_admin());
create policy "Admin updates students" on students
  for update using (public.is_admin()) with check (public.is_admin());
create policy "Admin deletes students" on students
  for delete using (public.is_admin());

-- teachers: admin full access, teacher reads own row only
create policy "Admin views all, teacher views own" on teachers
  for select using (public.is_admin() or profile_id = auth.uid());
create policy "Admin manages teachers" on teachers
  for insert with check (public.is_admin());
create policy "Admin updates teachers" on teachers
  for update using (public.is_admin()) with check (public.is_admin());
create policy "Admin deletes teachers" on teachers
  for delete using (public.is_admin());

-- courses: everyone logged in can read, only admin can write
create policy "Authenticated read" on courses for select using (auth.role() = 'authenticated');
create policy "Admin write" on courses for all using (public.is_admin()) with check (public.is_admin());

-- enrollments: admin/teacher see all, student sees only their own; only admin writes
create policy "View enrollments" on enrollments
  for select using (
    public.is_admin() or public.is_teacher()
    or exists (select 1 from students s where s.id = enrollments.student_id and s.profile_id = auth.uid())
  );
create policy "Admin write" on enrollments for insert with check (public.is_admin());
create policy "Admin update" on enrollments for update using (public.is_admin()) with check (public.is_admin());
create policy "Admin delete" on enrollments for delete using (public.is_admin());
```

### 3. Create your first Admin account
Because there's no public sign-up, you bootstrap the first Admin manually:

1. Left sidebar: **Authentication > Users > Add user > Create new user**.
2. Enter your email and a password, and check **Auto Confirm User**.
3. Click **Create user** — copy the **UID** it generates.
4. Back in **SQL Editor**, run (replace both placeholders):

```sql
insert into public.profiles (id, full_name, email, role)
values ('PASTE_UID_HERE', 'Your Name', 'your@email.com', 'admin');
```

Now you can log in at `login.html` with that email/password and you'll land in the Admin
portal. From there, use the Admin's Students/Teachers pages to create Teacher and Student
logins — no more manual SQL needed after this.

### 4. Enable Email/Password auth
Left sidebar: **Authentication > Sign In / Providers** — make sure **Email** is Enabled.

### 5. Get your API keys
Copy [js/supabase-config.example.js](js/supabase-config.example.js) to `js/supabase-config.js`
(that filename is gitignored so your real keys never get committed). Then fill it in from
**Project Settings (gear icon) > API Keys**:
- **Publishable key** (`sb_publishable_...`) — safe for the browser.
- **Secret key** — ⚠️ only for the admin-only code path (see the security note above). If
  you get "Invalid API key" errors when creating users, use the **legacy `service_role`
  JWT** instead, found under the "Legacy anon, service_role API keys" tab on the same page.
- **Project URL** from the **Data API** section (same page area).

### 6. Run it
Serve the folder with a local server:
- VS Code: install "Live Server", right-click `login.html` > **Open with Live Server**, or
- Node: `npx serve .`

Open `login.html` and log in with the Admin account you created in step 3.

## Project structure
```
login.html               Login page (no sign-up)
index.html               Dashboard shell: sidebar + all pages
css/style.css             Styling (sidebar layout, cards, tables)
js/supabase-config.js     Supabase URL + anon key (sb) + service_role key (sbAdmin)
js/common.js              Shared helpers (escapeHtml)
js/auth.js                Login, logout, session + profile/role loading, nav gating
js/nav.js                 Sidebar page switching
js/dashboard.js           Summary cards
js/users.js               Admin: list/edit/delete any user account, reset password
js/students.js            Students page: add/edit/delete (admin), view-only (teacher/self)
js/teachers.js            Teachers page: add/edit/delete (admin only)
js/courses.js             Courses page: add/edit/delete (admin), view-only (everyone else)
js/enrollment.js          Enrollments page: enroll/remove (admin), view (scoped by role)
js/profile.js             Own profile: view + edit full name
```

## Data model (Postgres tables)
- `profiles`: `full_name`, `email`, `role` (`admin`/`teacher`/`student`)
- `students`: `profile_id`, `student_number`, `department`
- `teachers`: `profile_id`, `department`, `title`
- `courses`: `name`, `code`, `credits`, `instructor`
- `enrollments`: `student_id`, `course_id`, `student_name`, `course_name`, `enrolled_at`
