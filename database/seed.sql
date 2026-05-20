-- Demo seed data for local Supabase development.
-- Demo password for all users: Password123!

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'alex@example.test',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"], "role": "member"}'::jsonb,
    '{"display_name": "Alex V."}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'sam@example.test',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"], "role": "member"}'::jsonb,
    '{"display_name": "Sam R."}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'moderator@example.test',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"], "role": "moderator"}'::jsonb,
    '{"display_name": "Morgan Moderator"}'::jsonb,
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.profiles (
  id,
  display_name,
  role,
  age_range,
  consent_accepted_at,
  goals,
  privacy_controls,
  accessibility_preferences
)
values
  (
    '00000000-0000-0000-0000-000000000101',
    'Alex V.',
    'member',
    '18-plus',
    now(),
    array['boundaries', 'workplace-confidence'],
    '{"savePracticeHistory": true, "allowPersonalizedRecommendations": true, "allowDeidentifiedProductAnalytics": false}'::jsonb,
    '{"captions": true, "reducedMotion": false, "adjustableType": "standard"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    'Sam R.',
    'member',
    '18-plus',
    now(),
    array['clearer-asks', 'conflict-repair'],
    '{"savePracticeHistory": true, "allowPersonalizedRecommendations": true, "allowDeidentifiedProductAnalytics": true}'::jsonb,
    '{"captions": true, "reducedMotion": true, "adjustableType": "large"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000201',
    'Morgan Moderator',
    'moderator',
    '18-plus',
    now(),
    array['hard-feedback'],
    '{"savePracticeHistory": false, "allowPersonalizedRecommendations": false, "allowDeidentifiedProductAnalytics": false}'::jsonb,
    '{"captions": true, "reducedMotion": false, "adjustableType": "standard"}'::jsonb
  )
on conflict (id) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  age_range = excluded.age_range,
  consent_accepted_at = excluded.consent_accepted_at,
  goals = excluded.goals,
  privacy_controls = excluded.privacy_controls,
  accessibility_preferences = excluded.accessibility_preferences;

insert into public.practice_scenarios (slug, title, description, difficulty, category, prompt)
values
  ('asking-for-raise', 'Asking for a raise', 'Make a calm case for compensation review.', 'stretch', 'work', 'You want to ask your manager for a raise after taking on more scope.'),
  ('roommate-boundary', 'Roommate boundary', 'Set expectations about shared space without escalating.', 'steady', 'home', 'Your roommate keeps leaving dishes in the sink for days.')
on conflict (slug) do nothing;

insert into public.communication_assessments (
  user_id,
  answers,
  style,
  score,
  recommended_lesson_ids
)
values
  (
    '00000000-0000-0000-0000-000000000101',
    '[{"questionId": "ask-directly", "value": 3}, {"questionId": "stay-kind", "value": 4}, {"questionId": "hold-boundary", "value": 2}, {"questionId": "regulate", "value": 3}]'::jsonb,
    'accommodating',
    '{"clarity": 59, "politeness": 82, "assertiveness": 36, "empathy": 78, "boundarySpecificity": 34, "emotionalRegulation": 54}'::jsonb,
    array['lesson-boundary', 'lesson-i-statement']
  );

insert into public.coach_sessions (id, user_id, title, relationship, tone, goal, status)
values
  (
    '10000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000101',
    'Deadline reset',
    'coworker',
    'warm-direct',
    'agree on a final deadline',
    'completed'
  )
on conflict (id) do nothing;

insert into public.coach_messages (
  session_id,
  user_id,
  input_text,
  rewritten_text,
  coaching_notes,
  safety_flags
)
values
  (
    '10000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000101',
    'I guess it is okay if you keep changing the deadline.',
    'I want to be clear and respectful: I need one final deadline so I can plan my work.',
    '[{"label": "Make the ask concrete", "detail": "The rewrite includes one clear next step."}]'::jsonb,
    '{}'
  );

insert into public.user_recommendations (user_id, title, reason, action, priority)
values
  (
    '00000000-0000-0000-0000-000000000101',
    'Practice shorter boundaries',
    'Your drafts are warm, but the ask can get buried.',
    'Try the boundary lesson next.',
    'high'
  ),
  (
    '00000000-0000-0000-0000-000000000101',
    'Add a pause before hard messages',
    'A short pause improves emotional regulation and tone.',
    'Use the role-play check-in before sending.',
    'medium'
  );

insert into public.moderation_reports (
  reporter_id,
  subject_type,
  subject_id,
  reason,
  details,
  status
)
values
  (
    '00000000-0000-0000-0000-000000000101',
    'coach_message',
    '10000000-0000-0000-0000-000000000101',
    'Demo report',
    'Seeded moderation queue item for reviewer workflow.',
    'open'
  );
