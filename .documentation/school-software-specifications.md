# Software Requirements Specification – School Management System

## System Design
- Single-school web application with **role-based access** (Admin, Teacher, Student).
- **Supabase MCP server** as the backend for authentication and database APIs.
- **Supabase Authentication** for email/password and OAuth sign-in.
- **REST APIs** exposed via Supabase MCP server for CRUD operations (no ORM).
- **PostgreSQL (Supabase-hosted)** database with Row Level Security (RLS) for role-based isolation.
- **Stripe** for fees/payments; webhooks persist receipts and update fee status.
- **Vercel** for hosting; incremental static for marketing pages; serverless functions for APIs.
- **Observability:** Supabase logs, API request logging with request-ID; alerting on webhook failures.

## Architecture Pattern
- **Modular monolith** within Next.js App Router (domains: auth, directory, academics, attendance, fees).
- **BFF pattern:** client talks only to Next.js APIs; APIs orchestrate Supabase DB + Stripe.
- **CQRS-lite:** reads optimized via GET endpoints; mutations via POST/PUT/PATCH/DELETE.
- **Background jobs** (webhooks / cron): Stripe webhook, nightly timetable cache, email invites.

## State Management
- **Server state:** TanStack Query (React Query) for GETs with cache keys by role/user.
- **Client/UI state:** Zustand for local UI (dialogs, filters); Sonner for toasts.
- **Forms & validation:** React Hook Form + Zod schemas (shared validation).

## Data Flow
- **Admin signup:** Landing page → create admin user in Supabase → redirect to admin dashboard.
- **Login:** User authenticates via Supabase Auth → session includes role → RBAC gates routes/APIs → load dashboard.
- **Admin setup:** Create classes/sections/subjects → upload users (CSV) → system creates student/teacher accounts → generate timetable and holiday calendar.
- **Teacher daily flow:** Open dashboard → view schedule → mark attendance → update attendance summary.
- **Student flow:** View timetable → attendance history → fee status → download receipt.
- **Fees:** Admin creates fee plans/invoices → Student pays via Stripe Checkout → webhook → persist payment + issue receipt.

## Technical Stack
- **Frontend:** React + Next.js (App Router), Tailwind CSS, shadcn/ui, Lucide Icons, Sonner.
- **Auth:** Supabase Auth (email/password, OAuth).
- **Backend:** Supabase MCP server (REST + RPC functions).
- **Database:** PostgreSQL (Supabase-hosted), with RLS for roles.
- **Payments:** Stripe (Checkout + Webhooks).
- **Email:** Supabase Auth email + transactional (optional).
- **Deploy:** Vercel.
- **Testing:** Vitest/Playwright; seed data with SQL migrations.

## Authentication Process
- **Providers:** Email/password, OAuth (Google, Microsoft, etc.) via Supabase Auth.
- **Role management:** Roles stored in `users.role` column (`admin`, `teacher`, `student`).
- **RBAC:** Enforced with RLS policies on each table.
- **Session → DB mapping:** On login, Supabase returns JWT containing `user_id` and `role`. Middleware enforces role-based access.
- **Invite flow:** Admin uploads teacher/student emails → system creates accounts with default password reset → Supabase sends email invite.

## Route Design
- **Public:** `/`, `/pricing`, `/docs`, `/signup`
- **Authenticated:**  
  - `/dashboard` (role-aware landing)  
  - **Admin:** `/classes`, `/sections`, `/subjects`, `/timetable`, `/holidays`, `/users`, `/fees`, `/reports`  
  - **Teacher:** `/schedule`, `/attendance`, `/classes/[classId]`  
  - **Student:** `/timetable`, `/attendance`, `/fees`, `/profile`
- **API (via Supabase MCP server):**  
  - `/rpc/admin_*` (admin only)  
  - `/rpc/teacher_*` (teacher only)  
  - `/rpc/student_*` (student only)  
  - `/api/webhooks/stripe` (public, verified by signature)

## API Design
- **Admin**
  - `POST /rpc/admin_import_users` – CSV upload; creates users with roles; emails invites.
  - `POST /rpc/admin_create_class` / `GET /rpc/admin_list_classes`
  - `POST /rpc/admin_create_section` / `GET /rpc/admin_list_sections`
  - `POST /rpc/admin_create_subject` / `GET /rpc/admin_list_subjects`
  - `POST /rpc/admin_create_timetable` / `GET /rpc/admin_get_timetable`
  - `POST /rpc/admin_add_holiday` / `GET /rpc/admin_list_holidays`
  - `POST /rpc/admin_create_fee_plan` / `GET /rpc/admin_list_fee_plans`
  - `POST /rpc/admin_create_invoice` / `GET /rpc/admin_list_invoices`
- **Teacher**
  - `GET /rpc/teacher_schedule(week_start)`
  - `POST /rpc/teacher_mark_attendance`
  - `GET /rpc/teacher_class_students(class_id)`
- **Student**
  - `GET /rpc/student_timetable`
  - `GET /rpc/student_attendance(month)`
  - `GET /rpc/student_fees` / `GET /rpc/student_receipts`
- **Payments**
  - `POST /api/fees/checkout` – creates Stripe Checkout Session.
  - `POST /api/webhooks/stripe` – verifies signature; inserts payment, generates receipt.

## Database Design ERD
- **users** (id, email, name, role: enum[admin|teacher|student], photo_url, created_at)
- **classes** (id, name, grade)
- **sections** (id, class_id → classes, name)
- **subjects** (id, name, code)
- **teacher_assignments** (id, teacher_user_id → users, class_id, section_id, subject_id)
- **students** (id, user_id → users, roll_no, contact_info)
- **enrollments** (id, student_id → students, class_id, section_id, academic_year)
- **timetables** (id, class_id, section_id, week_start)
- **timetable_slots** (id, timetable_id → timetables, day_of_week, period_no, subject_id, teacher_assignment_id)
- **holidays** (id, date, title, type)
- **attendance** (id, student_id, timetable_slot_id, date, status: enum[present|absent|late], marked_by_user_id)
- **fee_plans** (id, name, amount, frequency: enum[one_time|monthly|term])
- **invoices** (id, student_id, fee_plan_id, due_date, amount, status: enum[pending|paid|overdue], stripe_invoice_id?)
- **payments** (id, invoice_id, amount, currency, provider: enum[stripe], provider_ref, paid_at)
- **receipts** (id, payment_id, receipt_no, url)
- **audit_logs** (id, user_id, action, entity, entity_id, metadata, created_at)

### RLS/Integrity Highlights
- All tables scoped by `users.role` instead of tenant.
- Foreign keys enforce integrity between related entities.
- Example RLS:  
  - **Admin:** full access to all tables.  
  - **Teacher:** can read/write attendance for their assigned classes only.  
  - **Student:** can read only their own attendance, fees, and profile.

