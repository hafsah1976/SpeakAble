# Risk Register

| Risk | Area | Severity | Likelihood | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- |
| Users enter sensitive personal, workplace, health, or relationship details. | Privacy | High | High | Data minimization, short retention defaults, deletion controls, log redaction, encrypted transport, RLS. | Engineering |
| Raw user text leaks through logs or error tracking. | Privacy | High | Medium | Structured logging with redaction, no request-body logging, error scrubbers, review production log sinks. | Engineering |
| Broken RLS exposes another user's coaching history. | Privacy | Critical | Medium | RLS on every private table, policy tests, no client-supplied owner IDs, admin access auditing. | Engineering |
| Users treat the app as therapy, legal, HR, or crisis advice. | Safety | High | Medium | Product copy avoids professional claims, crisis escalation copy, scoped coaching language, disallowed advice categories. | Product |
| Generated rewrite escalates conflict or encourages unsafe confrontation. | Safety | High | Medium | Safety classifier, conservative coaching style, boundary framing, post-generation validation, user reporting. | Safety |
| Abuse users weaponize the coach to manipulate, harass, threaten, or coerce. | Safety | High | Medium | Moderation rules for threats, harassment, coercion, stalking, evasion, and intimate partner abuse contexts. | Safety |
| Model provider stores or trains on sensitive text in a future LLM version. | Privacy | High | Medium | Vendor review, DPA, zero-retention mode when available, redaction, user consent, provider abstraction. | Legal/Engineering |
| Report queue exposes sensitive text to too many staff. | Moderation | High | Medium | Least-privilege reviewer roles, audit logs, redaction-first moderation UI, staff training. | Trust and Safety |
| Users cannot remove old sensitive coaching history. | Privacy | High | Low | Self-serve deletion, retention jobs, deletion verification tests, backup retention policy. | Engineering |
| Prompt injection or jailbreaks force unsafe coaching outputs. | Safety | Medium | Medium | Treat user text as untrusted content, schema validation, safety checks before and after generation. | Engineering |
| Bias in tone coaching penalizes dialects, cultures, or neurodivergent communication styles. | Safety | Medium | Medium | Inclusive examples, user-selectable tone, feedback loop, review metrics across cohorts where lawful and ethical. | Product |
| False positives block legitimate boundary-setting language. | Moderation | Medium | Medium | User override for low-risk warnings, appeal path, granular safety flags. | Safety |
| Admin misuse of privileged access. | Privacy | High | Low | RBAC, audit logs, periodic access reviews, break-glass procedures. | Security |
| Insufficient rate limits allow spam or costly model abuse. | Safety/Cost | Medium | Medium | Per-user and per-IP limits, abuse metrics, quotas, CAPTCHA only on suspicious traffic. | Engineering |
| Mobile device notifications reveal sensitive content. | Privacy | Medium | Medium | No sensitive text in push notifications, opt-in notifications only, local privacy settings. | Mobile |
| Age gate is bypassed or consent state is ambiguous. | Privacy/Safety | High | Medium | Store consent timestamp, block under-13 use, retest onboarding on auth/session changes, keep policy copy explicit. | Product/Engineering |
| Voice role-play records or exposes sensitive speech. | Privacy | High | Medium | Keep voice behind a feature flag, require separate consent, provide captions, avoid storing raw audio by default. | Engineering |
| External sharing leaks sensitive drafts or generated rewrites. | Privacy/Safety | High | Medium | Keep sharing behind `EXTERNAL_SHARING_ENABLED`, moderate before share, strip identifiers, require explicit confirmation. | Product/Engineering |
| Development demo fallback accidentally ships as a production path. | Privacy/Safety | High | Low | Production deployment checklist requires fallback flags disabled and API URL configured; CI and docs call out the setting. | Engineering |
| Accessibility gaps exclude users with visual, motor, auditory, or cognitive needs. | Safety | Medium | Medium | Keyboard navigation, screen-reader labels, captions, reduced motion, adjustable type, and accessibility QA gates. | Product/Design |
