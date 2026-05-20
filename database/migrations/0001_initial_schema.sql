create extension if not exists pgcrypto;
create extension if not exists vector;

create type public.app_role as enum ('member', 'moderator', 'admin');
create type public.session_status as enum ('draft', 'completed', 'deleted');
create type public.report_status as enum ('open', 'triaged', 'resolved', 'dismissed');
create type public.practice_difficulty as enum ('starter', 'steady', 'stretch');
create type public.privacy_request_status as enum ('queued', 'processing', 'completed', 'cancelled');

create table public.app_users (
  id uuid primary key,
  email text,
  role public.app_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references public.app_users(id) on delete cascade,
  display_name text,
  role public.app_role not null default 'member',
  communication_goal text,
  age_range text,
  consent_accepted_at timestamptz,
  goals text[] not null default '{}',
  privacy_controls jsonb not null default '{
    "savePracticeHistory": true,
    "allowPersonalizedRecommendations": true,
    "allowDeidentifiedProductAnalytics": false
  }'::jsonb,
  accessibility_preferences jsonb not null default '{
    "captions": true,
    "reducedMotion": false,
    "adjustableType": "standard"
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coach_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  title text not null default 'Untitled practice',
  relationship text not null,
  tone text not null,
  goal text not null,
  status public.session_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.coach_sessions(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  input_text text,
  rewritten_text text,
  coaching_notes jsonb not null default '[]'::jsonb,
  safety_flags text[] not null default '{}',
  user_rating int check (user_rating between 1 and 5),
  retention_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.practice_scenarios (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  difficulty public.practice_difficulty not null,
  category text not null,
  prompt text not null,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lessons (
  id text primary key,
  title text not null,
  objective text not null,
  example jsonb not null,
  exercises jsonb not null default '[]'::jsonb,
  estimated_minutes int not null check (estimated_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  lesson_id text not null references public.lessons(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table public.communication_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  answers jsonb not null,
  style text not null,
  score jsonb not null,
  recommended_lesson_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  scenario_id uuid references public.practice_scenarios(id) on delete set null,
  draft_text text,
  score jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.role_play_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  scenario_id uuid references public.practice_scenarios(id) on delete set null,
  mode text not null default 'text' check (mode in ('text', 'voice')),
  voice_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.role_play_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.role_play_sessions(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  user_message text,
  coach_reply text,
  captions text[] not null default '{}',
  score jsonb not null default '{}'::jsonb,
  safety_flags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.feedback_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  subject_type text not null,
  subject_id uuid not null,
  clarity int not null check (clarity between 0 and 100),
  politeness int not null check (politeness between 0 and 100),
  assertiveness int not null check (assertiveness between 0 and 100),
  empathy int not null check (empathy between 0 and 100),
  boundary_specificity int not null check (boundary_specificity between 0 and 100),
  emotional_regulation int not null check (emotional_regulation between 0 and 100),
  created_at timestamptz not null default now()
);

create table public.user_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  title text not null,
  reason text not null,
  action text not null,
  priority text not null check (priority in ('low', 'medium', 'high')),
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete set null,
  name text not null,
  source text not null check (source in ('web', 'mobile', 'api')),
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analytics_event_name_safe check (
    name in (
      'onboarding_saved',
      'baseline_assessment_submitted',
      'coach_rewrite_requested',
      'role_play_turn_submitted',
      'privacy_export_requested',
      'privacy_deletion_requested',
      'moderation_report_submitted',
      'accessibility_preference_changed'
    )
  )
);

create table public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.app_users(id) on delete set null,
  subject_type text not null,
  subject_id uuid,
  reason text not null,
  details text,
  status public.report_status not null default 'open',
  reviewer_id uuid references public.app_users(id) on delete set null,
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  request_type text not null check (request_type in ('export', 'delete')),
  status public.privacy_request_status not null default 'queued',
  requested_payload jsonb not null default '{}'::jsonb,
  export_storage_key text,
  estimated_completion timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.app_users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index coach_sessions_user_created_idx on public.coach_sessions (user_id, created_at desc);
create index coach_messages_user_created_idx on public.coach_messages (user_id, created_at desc);
create index practice_attempts_user_created_idx on public.practice_attempts (user_id, created_at desc);
create index communication_assessments_user_created_idx on public.communication_assessments (user_id, created_at desc);
create index lesson_progress_user_lesson_idx on public.lesson_progress (user_id, lesson_id);
create index role_play_sessions_user_created_idx on public.role_play_sessions (user_id, created_at desc);
create index role_play_turns_user_created_idx on public.role_play_turns (user_id, created_at desc);
create index feedback_scores_user_created_idx on public.feedback_scores (user_id, created_at desc);
create index user_recommendations_user_created_idx on public.user_recommendations (user_id, created_at desc);
create index analytics_events_name_created_idx on public.analytics_events (name, created_at desc);
create index moderation_reports_status_created_idx on public.moderation_reports (status, created_at desc);
create index privacy_requests_user_created_idx on public.privacy_requests (user_id, created_at desc);
create index practice_scenarios_embedding_idx on public.practice_scenarios
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger coach_sessions_set_updated_at
  before update on public.coach_sessions
  for each row execute function public.set_updated_at();

create trigger coach_messages_set_updated_at
  before update on public.coach_messages
  for each row execute function public.set_updated_at();

create trigger practice_scenarios_set_updated_at
  before update on public.practice_scenarios
  for each row execute function public.set_updated_at();

create trigger lessons_set_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

create trigger lesson_progress_set_updated_at
  before update on public.lesson_progress
  for each row execute function public.set_updated_at();

create trigger practice_attempts_set_updated_at
  before update on public.practice_attempts
  for each row execute function public.set_updated_at();

create trigger role_play_sessions_set_updated_at
  before update on public.role_play_sessions
  for each row execute function public.set_updated_at();

create trigger moderation_reports_set_updated_at
  before update on public.moderation_reports
  for each row execute function public.set_updated_at();

create trigger privacy_requests_set_updated_at
  before update on public.privacy_requests
  for each row execute function public.set_updated_at();

create trigger app_users_set_updated_at
  before update on public.app_users
  for each row execute function public.set_updated_at();

create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid;
$$;

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('app.current_user_role', true), '')::public.app_role,
    'member'::public.app_role
  );
$$;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = public.current_user_id()
      and role in ('moderator', 'admin')
  ) or public.current_user_role() in ('moderator', 'admin');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = public.current_user_id()
      and role = 'admin'
  ) or public.current_user_role() = 'admin';
$$;

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only admins can change profile roles.';
  end if;

  return new;
end;
$$;

create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_profile_role_change();

alter table public.app_users enable row level security;
alter table public.profiles enable row level security;
alter table public.coach_sessions enable row level security;
alter table public.coach_messages enable row level security;
alter table public.practice_scenarios enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.communication_assessments enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.role_play_sessions enable row level security;
alter table public.role_play_turns enable row level security;
alter table public.feedback_scores enable row level security;
alter table public.user_recommendations enable row level security;
alter table public.analytics_events enable row level security;
alter table public.moderation_reports enable row level security;
alter table public.privacy_requests enable row level security;
alter table public.audit_logs enable row level security;

create policy "app_users_select_own_or_moderator"
  on public.app_users for select
  using (id = public.current_user_id() or public.is_moderator());

create policy "app_users_insert_own"
  on public.app_users for insert
  with check (id = public.current_user_id());

create policy "app_users_update_own"
  on public.app_users for update
  using (id = public.current_user_id())
  with check (id = public.current_user_id());

create policy "profiles_select_own_or_moderator"
  on public.profiles for select
  using (id = public.current_user_id() or public.is_moderator());

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = public.current_user_id());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = public.current_user_id())
  with check (id = public.current_user_id());

create policy "sessions_owner_all"
  on public.coach_sessions for all
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

create policy "messages_owner_all"
  on public.coach_messages for all
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

create policy "messages_moderator_read"
  on public.coach_messages for select
  using (public.is_moderator());

create policy "scenarios_read_authenticated"
  on public.practice_scenarios for select
  using (public.current_user_id() is not null);

create policy "scenarios_admin_write"
  on public.practice_scenarios for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "lessons_read_authenticated"
  on public.lessons for select
  using (public.current_user_id() is not null);

create policy "lessons_admin_write"
  on public.lessons for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "lesson_progress_owner_all"
  on public.lesson_progress for all
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

create policy "assessments_owner_all"
  on public.communication_assessments for all
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

create policy "attempts_owner_all"
  on public.practice_attempts for all
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

create policy "role_play_sessions_owner_all"
  on public.role_play_sessions for all
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

create policy "role_play_turns_owner_all"
  on public.role_play_turns for all
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

create policy "role_play_turns_moderator_read"
  on public.role_play_turns for select
  using (public.is_moderator());

create policy "feedback_scores_owner_read"
  on public.feedback_scores for select
  using (user_id = public.current_user_id());

create policy "feedback_scores_owner_insert"
  on public.feedback_scores for insert
  with check (user_id = public.current_user_id());

create policy "recommendations_owner_all"
  on public.user_recommendations for all
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

create policy "analytics_insert_own"
  on public.analytics_events for insert
  with check (user_id = public.current_user_id() or user_id is null);

create policy "analytics_admin_read"
  on public.analytics_events for select
  using (public.is_admin());

create policy "reports_create_own"
  on public.moderation_reports for insert
  with check (reporter_id = public.current_user_id());

create policy "reports_read_own_or_moderator"
  on public.moderation_reports for select
  using (reporter_id = public.current_user_id() or public.is_moderator());

create policy "reports_update_moderator"
  on public.moderation_reports for update
  using (public.is_moderator())
  with check (public.is_moderator());

create policy "privacy_requests_owner_all"
  on public.privacy_requests for all
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

create policy "privacy_requests_admin_read"
  on public.privacy_requests for select
  using (public.is_admin());

create policy "audit_logs_admin_read"
  on public.audit_logs for select
  using (public.is_admin());

insert into public.practice_scenarios (slug, title, description, difficulty, category, prompt)
values
  (
    'deadline-reset',
    'Deadline keeps moving',
    'Ask for a stable plan when a timeline has changed several times.',
    'starter',
    'work',
    'A project deadline has moved three times and you need a final date.'
  ),
  (
    'social-battery',
    'Declining an invitation',
    'Say no without overexplaining or sounding dismissive.',
    'starter',
    'personal',
    'A friend invited you out, but you need a quiet night.'
  ),
  (
    'meeting-interruption',
    'Interrupted in a meeting',
    'Return to your point calmly and keep the room collaborative.',
    'steady',
    'work',
    'Someone keeps talking over you while you are presenting an idea.'
  ),
  (
    'family-boundary',
    'Family boundary',
    'State a personal boundary with care and firmness.',
    'stretch',
    'personal',
    'A family member is asking for details you do not want to discuss.'
  )
on conflict (slug) do nothing;

insert into public.lessons (id, title, objective, example, exercises, estimated_minutes)
values
  (
    'lesson-i-statement',
    'Use an I statement',
    'Name your experience without blaming or shrinking.',
    '{"before": "You keep ignoring what I need.", "after": "I feel stuck when I do not get a reply, and I need a clear yes or no by Friday."}'::jsonb,
    '[{"id": "exercise-i-statement", "prompt": "Rewrite: You never listen to me in meetings.", "exampleAnswer": "I want to finish my point before we move on."}]'::jsonb,
    4
  ),
  (
    'lesson-boundary',
    'Make the boundary specific',
    'Explain what you can do, what you cannot do, and the next step.',
    '{"before": "I cannot keep doing this.", "after": "I can help today until 4 PM. After that I need to hand this back to you."}'::jsonb,
    '[{"id": "exercise-boundary", "prompt": "Rewrite: Stop asking me at the last minute.", "exampleAnswer": "I need at least one day of notice for new requests."}]'::jsonb,
    5
  ),
  (
    'lesson-repair',
    'Repair without over-apologizing',
    'Own impact, make a clear request, and avoid a shame spiral.',
    '{"before": "I am so sorry, I am terrible at this.", "after": "I am sorry I missed that detail. I will update it today and send the corrected version by 3 PM."}'::jsonb,
    '[{"id": "exercise-repair", "prompt": "Rewrite: Sorry, sorry, I know I messed everything up.", "exampleAnswer": "I am sorry I missed the deadline. I can send the revised draft tomorrow morning."}]'::jsonb,
    6
  )
on conflict (id) do nothing;
