"use client";

import {
  Accessibility,
  BookOpenCheck,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Flag,
  Gauge,
  LifeBuoy,
  LogOut,
  MessageSquareText,
  MicOff,
  PauseCircle,
  Send,
  ShieldCheck,
  Target,
  Trash2
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  baselineQuestions,
  buildAssessmentResult,
  buildLocalCoachingResponse,
  buildRolePlayResponse,
  createAssertiveCoachClient,
  demoProgress,
  featureFlags,
  guidedLessons,
  practiceScenarios,
  type AgeRange,
  type BaselineAssessmentResponse,
  type CoachRewriteResponse,
  type CoachTone,
  type CommunicationGoal,
  type FeedbackScore,
  type PrivacyDeletionResponse,
  type PrivacyExportResponse,
  type Relationship,
  type RolePlayResponse
} from "@speakable/types";

const tones: Array<{ value: CoachTone; label: string; helper: string }> = [
  { value: "warm-direct", label: "Warm direct", helper: "Clear and collaborative" },
  { value: "firm-boundary", label: "Firm boundary", helper: "Short and steady" },
  { value: "repair", label: "Repair", helper: "Own impact and reset" },
  { value: "curious", label: "Curious", helper: "Ask while naming the need" }
];

const relationships: Array<{ value: Relationship; label: string }> = [
  { value: "coworker", label: "Coworker" },
  { value: "manager", label: "Manager" },
  { value: "friend", label: "Friend" },
  { value: "partner", label: "Partner" },
  { value: "family", label: "Family" },
  { value: "service-provider", label: "Service provider" },
  { value: "other", label: "Other" }
];

const goals: Array<{ value: CommunicationGoal; label: string }> = [
  { value: "clearer-asks", label: "Clearer asks" },
  { value: "boundaries", label: "Boundaries" },
  { value: "hard-feedback", label: "Hard feedback" },
  { value: "less-apologizing", label: "Less apologizing" },
  { value: "conflict-repair", label: "Conflict repair" },
  { value: "workplace-confidence", label: "Workplace confidence" }
];

const allowLocalDemoFallback =
  process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ALLOW_LOCAL_DEMO_FALLBACK !== "false";

export function CoachWorkspace({
  accountEmail,
  authMode = "signed-in",
  getAccessToken,
  onSignOut
}: {
  accountEmail?: string;
  authMode?: "demo" | "signed-in";
  getAccessToken?: () => Promise<string | undefined> | string | undefined;
  onSignOut?: () => Promise<void> | void;
}) {
  const [inputText, setInputText] = useState(
    "I guess it is okay if you keep changing the deadline, but it is making my week hard."
  );
  const [context, setContext] = useState("The project deadline has moved three times.");
  const [goal, setGoal] = useState("agree on a final deadline");
  const [relationship, setRelationship] = useState<Relationship>("coworker");
  const [tone, setTone] = useState<CoachTone>("warm-direct");
  const [ageRange, setAgeRange] = useState<AgeRange>("18-plus");
  const [consentAccepted, setConsentAccepted] = useState(true);
  const [selectedGoals, setSelectedGoals] = useState<CommunicationGoal[]>([
    "boundaries",
    "workplace-confidence"
  ]);
  const [saveHistory, setSaveHistory] = useState(true);
  const [personalized, setPersonalized] = useState(true);
  const [analytics, setAnalytics] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [typeScale, setTypeScale] = useState<"standard" | "large" | "extra-large">("standard");
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, number>>({
    "ask-directly": 3,
    "stay-kind": 4,
    "hold-boundary": 2,
    regulate: 3
  });
  const [assessmentResult, setAssessmentResult] = useState<BaselineAssessmentResponse>(() =>
    buildAssessmentResult({
      answers: baselineQuestions.map((question) => ({
        questionId: question.id,
        value: assessmentAnswers[question.id] ?? 3
      }))
    })
  );
  const [result, setResult] = useState<CoachRewriteResponse>(() =>
    buildLocalCoachingResponse({
      inputText,
      context,
      goal,
      relationship,
      tone
    })
  );
  const [rolePlayMessage, setRolePlayMessage] = useState(
    "I need one final deadline so I can plan my work."
  );
  const [rolePlayResult, setRolePlayResult] = useState<RolePlayResponse>(() =>
    buildRolePlayResponse({
      scenarioId: "scenario-deadline",
      userMessage: rolePlayMessage,
      mode: "text"
    })
  );
  const [privacyExport, setPrivacyExport] = useState<PrivacyExportResponse>(() => ({
    id: "export-preview",
    generatedAt: "preview",
    format: "json",
    includes: ["profile", "privacyControls", "assessmentSummary", "coachSessions", "reports"]
  }));
  const [deletionRequest, setDeletionRequest] = useState<PrivacyDeletionResponse>(() => ({
    id: "delete-preview",
    status: "queued",
    createdAt: "preview",
    estimatedCompletion: "preview"
  }));
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(
    allowLocalDemoFallback ? "Development demo draft" : "Private draft"
  );

  const apiClient = useMemo(() => {
    return createAssertiveCoachClient({
      baseUrl: process.env.NEXT_PUBLIC_API_URL,
      allowLocalDemoFallback,
      getAccessToken
    });
  }, [getAccessToken]);

  function toggleGoal(value: CommunicationGoal) {
    setSelectedGoals((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  async function completeOnboarding() {
    await apiClient.trackEvent({
      name: "onboarding_saved",
      source: "web",
      properties: { surface: "setup", goalCount: selectedGoals.length }
    });
    const response = await apiClient.completeOnboarding({
      ageRange,
      consentAccepted,
      goals: selectedGoals,
      privacyControls: {
        savePracticeHistory: saveHistory,
        allowPersonalizedRecommendations: personalized,
        allowDeidentifiedProductAnalytics: analytics
      },
      accessibility: {
        captions,
        reducedMotion,
        adjustableType: typeScale
      }
    });

    setStatus(response.completed ? "Onboarding saved" : "Age gate or consent needs review");
  }

  async function submitAssessment() {
    await apiClient.trackEvent({
      name: "baseline_assessment_submitted",
      source: "web",
      properties: { surface: "assessment" }
    });
    const response = await apiClient.submitAssessment({
      answers: baselineQuestions.map((question) => ({
        questionId: question.id,
        value: assessmentAnswers[question.id] ?? 3
      }))
    });
    setAssessmentResult(response);
    setStatus("Assessment updated");
  }

  async function handleSubmit() {
    if (!inputText.trim()) {
      setStatus("Add the message you want to practice first.");
      return;
    }

    setIsLoading(true);
    setStatus("Coaching your draft");
    await apiClient.trackEvent({
      name: "coach_rewrite_requested",
      source: "web",
      properties: { surface: "coach", safetyFlagCount: result.safetyFlags.length }
    });

    const payload = { inputText, context, goal, relationship, tone };

    try {
      const response = await apiClient.rewriteMessage(payload);
      setResult(response);
      setStatus("Rewrite ready");
    } catch {
      setStatus("API unavailable. No production fallback was used.");
    } finally {
      setIsLoading(false);
    }
  }

  async function runRolePlay() {
    await apiClient.trackEvent({
      name: "role_play_turn_submitted",
      source: "web",
      properties: {
        surface: "roleplay",
        mode: featureFlags.voiceRolePlay ? "voice" : "text",
        featureFlag: "voiceRolePlay"
      }
    });
    const response = await apiClient.rolePlay({
      scenarioId: "scenario-deadline",
      userMessage: rolePlayMessage,
      mode: featureFlags.voiceRolePlay ? "voice" : "text"
    });
    setRolePlayResult(response);
    setStatus("Role-play feedback ready");
  }

  async function handleReport() {
    await apiClient.trackEvent({
      name: "moderation_report_submitted",
      source: "web",
      properties: { surface: "privacy", safetyFlagCount: result.safetyFlags.length }
    });
    await apiClient.createReport({
      subjectType: "coach_message",
      subjectId: result.id,
      reason: "Needs review",
      details: "User requested a moderation review from the coaching workspace."
    });
    setStatus("Report queued for review");
  }

  async function exportData() {
    await apiClient.trackEvent({
      name: "privacy_export_requested",
      source: "web",
      properties: { surface: "privacy" }
    });
    const response = await apiClient.exportPrivacyData();
    setPrivacyExport(response);
    setStatus("Privacy export prepared");
  }

  async function deleteData() {
    await apiClient.trackEvent({
      name: "privacy_deletion_requested",
      source: "web",
      properties: { surface: "privacy" }
    });
    const response = await apiClient.requestDeletion({
      deletePracticeHistory: true,
      deleteAssessment: true,
      deleteAccount: false
    });
    setDeletionRequest(response);
    setStatus("Deletion request queued");
  }

  function applyScenario(prompt: string) {
    setContext(prompt);
    setInputText("I do not want this to become tense, but I need to say something.");
    setGoal("state what I need without blaming the other person");
    setStatus("Scenario loaded");
  }

  return (
    <main className={`app-shell type-${typeScale} ${reducedMotion ? "reduce-motion" : ""}`}>
      <aside className="nav-rail" aria-label="Primary">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            SA
          </div>
          <div>
            <p className="brand-name">SpeakAble</p>
            <p className="brand-caption">Clear, kind, firm</p>
          </div>
        </div>

        <AccountPanel accountEmail={accountEmail} authMode={authMode} onSignOut={onSignOut} />

        <nav className="nav-list">
          <a className="nav-item active" href="#coach">
            <MessageSquareText size={18} aria-hidden="true" />
            Coach
          </a>
          <a className="nav-item" href="#scroll-break">
            <PauseCircle size={18} aria-hidden="true" />
            Scroll break
          </a>
          <a className="nav-item" href="#setup">
            <CheckCircle2 size={18} aria-hidden="true" />
            Setup
          </a>
          <a className="nav-item" href="#lessons">
            <BookOpenCheck size={18} aria-hidden="true" />
            Lessons
          </a>
          <a className="nav-item" href="#roleplay">
            <Bot size={18} aria-hidden="true" />
            Role-play
          </a>
          <a className="nav-item" href="#privacy">
            <ShieldCheck size={18} aria-hidden="true" />
            Privacy
          </a>
        </nav>

        <div className="support-panel">
          <LifeBuoy size={18} aria-hidden="true" />
          <p>For immediate danger or crisis support, contact local emergency services or a trusted person nearby.</p>
        </div>
      </aside>

      <section className="workspace" id="coach">
        <header className="workspace-header">
          <div>
            <h1>Practice saying it clearly.</h1>
            <p>Turn avoidance into one respectful request, boundary, or repair attempt.</p>
          </div>
          <div className="session-chip" aria-live="polite">
            <ShieldCheck size={16} aria-hidden="true" />
            {status}
          </div>
        </header>

        <section className="focus-strip" id="scroll-break" aria-labelledby="scroll-break-title">
          <div>
            <h2 id="scroll-break-title">Scroll break</h2>
            <p>When you catch yourself avoiding a message, draft one honest sentence here and leave the feed.</p>
          </div>
          <button className="secondary-action compact-action" type="button" onClick={handleSubmit} disabled={isLoading}>
            <PauseCircle size={16} aria-hidden="true" />
            Coach this draft
          </button>
        </section>

        <div className="practice-layout">
          <section className="compose-panel" aria-labelledby="compose-title">
            <SectionHeader
              title="Your draft"
              titleId="compose-title"
              description="Messy is fine. The coach will make it clear, kind, and specific."
              icon={<MessageSquareText size={20} aria-hidden="true" />}
            />

            <label className="field-label" htmlFor="message">
              Message
            </label>
            <textarea
              id="message"
              className="message-input"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              rows={7}
            />

            <div className="form-row">
              <label>
                <span className="field-label">Relationship</span>
                <select
                  value={relationship}
                  onChange={(event) => setRelationship(event.target.value as Relationship)}
                >
                  {relationships.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="field-label">Goal</span>
                <textarea
                  className="compact-textarea"
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  rows={2}
                />
              </label>
            </div>

            <label className="field-label" htmlFor="context">
              Context
            </label>
            <textarea
              id="context"
              className="compact-textarea"
              value={context}
              onChange={(event) => setContext(event.target.value)}
              rows={2}
            />

            <div className="tone-grid" role="radiogroup" aria-label="Tone">
              {tones.map((item) => (
                <button
                  key={item.value}
                  className={`tone-option ${tone === item.value ? "selected" : ""}`}
                  type="button"
                  onClick={() => setTone(item.value)}
                  role="radio"
                  aria-checked={tone === item.value}
                >
                  <span>{item.label}</span>
                  <small>{item.helper}</small>
                </button>
              ))}
            </div>

            <button className="primary-action" type="button" onClick={handleSubmit} disabled={isLoading}>
              <Send size={18} aria-hidden="true" />
              {isLoading ? "Coaching" : "Rewrite assertively"}
            </button>
          </section>

          <section className="result-panel" aria-labelledby="result-title">
            <SectionHeader
              title="Coach response"
              titleId="result-title"
              description="Structured feedback stays concise and safety-gated before display."
              icon={
                <button className="icon-button" type="button" onClick={handleReport} aria-label="Report result">
                  <Flag size={18} aria-hidden="true" />
                </button>
              }
            />

            <blockquote>{result.assertiveText}</blockquote>

            {result.safetyFlags.length > 0 || result.outputSafetyFlags.length > 0 ? (
              <div className="safety-callout">
                <ShieldCheck size={18} aria-hidden="true" />
                <p>
                  Safety-sensitive content was detected. Slow down, use support, and avoid direct confrontation if
                  there is immediate risk.
                </p>
              </div>
            ) : null}

            <ScoreBars score={result.feedbackScore} />

            <div className="notes-list">
              {result.coachingNotes.map((note) => (
                <article key={note.label} className="note-row">
                  <ClipboardCheck size={18} aria-hidden="true" />
                  <div>
                    <h3>{note.label}</h3>
                    <p>{note.detail}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="practice-strip">
              {result.suggestedPractice.map((practice) => (
                <p key={practice}>{practice}</p>
              ))}
            </div>
          </section>
        </div>

        <section className="setup-panel" id="setup" aria-labelledby="setup-title">
          <SectionHeader
            title="Readiness"
            titleId="setup-title"
            description="Consent, goals, baseline style, accessibility, and privacy controls live together."
            icon={<CheckCircle2 size={20} aria-hidden="true" />}
          />

          <div className="readiness-grid">
            <div className="readiness-block">
              <h3>Onboarding</h3>
              <div className="setup-grid">
                <label>
                  <span className="field-label">Age gate</span>
                  <select value={ageRange} onChange={(event) => setAgeRange(event.target.value as AgeRange)}>
                    <option value="under-13">Under 13</option>
                    <option value="13-15">13 to 15</option>
                    <option value="16-17">16 to 17</option>
                    <option value="18-plus">18 or older</option>
                  </select>
                </label>

                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={consentAccepted}
                    onChange={(event) => setConsentAccepted(event.target.checked)}
                  />
                  <span>Communication practice only. Not therapy, legal, HR, or crisis advice.</span>
                </label>
              </div>

              <div className="goal-grid" aria-label="Communication goals">
                {goals.map((item) => (
                  <label key={item.value} className="check-card">
                    <input
                      type="checkbox"
                      checked={selectedGoals.includes(item.value)}
                      onChange={() => toggleGoal(item.value)}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              <button className="secondary-action compact-action" type="button" onClick={completeOnboarding}>
                <ShieldCheck size={16} aria-hidden="true" />
                Save onboarding
              </button>
            </div>

            <div className="readiness-block">
              <h3>Assessment</h3>
              <div className="assessment-grid">
                {baselineQuestions.map((question) => (
                  <label key={question.id} className="range-row">
                    <span>{question.prompt}</span>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={assessmentAnswers[question.id] ?? 3}
                      aria-label={question.prompt}
                      onChange={(event) =>
                        setAssessmentAnswers((current) => ({
                          ...current,
                          [question.id]: Number(event.target.value)
                        }))
                      }
                    />
                    <small>
                      {question.lowLabel} - {question.highLabel}
                    </small>
                  </label>
                ))}
              </div>

              <div className="assessment-result">
                <p>
                  Style: <strong>{assessmentResult.style}</strong>
                </p>
                <p>{assessmentResult.summary}</p>
              </div>

              <button className="secondary-action compact-action" type="button" onClick={submitAssessment}>
                <Gauge size={16} aria-hidden="true" />
                Update assessment
              </button>
            </div>
          </div>
        </section>
      </section>

      <aside className="utility-panel">
        <section id="progress" className="side-section">
          <SectionHeader title="Progress" icon={<Gauge size={18} aria-hidden="true" />} compact />
          <div className="metric-grid">
            <Metric label="day streak" value={demoProgress.streakDays} />
            <Metric label="rewrites" value={demoProgress.rewritesThisWeek} />
            <Metric label="saved" value={demoProgress.savedPhrases} />
          </div>
          <p className="skill-note">
            Strongest: {demoProgress.strongestSkill}. Next: {demoProgress.nextSkill}.
          </p>
        </section>

        <section id="practice" className="side-section">
          <SectionHeader title="Practice queue" icon={<Target size={18} aria-hidden="true" />} compact />
          <div className="scenario-list">
            {practiceScenarios.map((scenario) => (
              <button key={scenario.id} type="button" onClick={() => applyScenario(scenario.prompt)}>
                <span>{scenario.title}</span>
                <small>
                  {scenario.category} - {scenario.difficulty}
                </small>
              </button>
            ))}
          </div>
        </section>

        <section id="roleplay" className="side-section">
          <SectionHeader title="Role-play" icon={<Bot size={18} aria-hidden="true" />} compact />
          <label className="field-label" htmlFor="roleplay-message">
            Text simulation
          </label>
          <textarea
            id="roleplay-message"
            className="compact-textarea"
            value={rolePlayMessage}
            onChange={(event) => setRolePlayMessage(event.target.value)}
            rows={3}
          />
          <div className="feature-flag">
            <MicOff size={16} aria-hidden="true" />
            Voice optional: {featureFlags.voiceRolePlay ? "enabled" : "disabled"}
          </div>
          <button className="secondary-action" type="button" onClick={runRolePlay}>
            <Bot size={16} aria-hidden="true" />
            Run role-play
          </button>
          <div className="roleplay-feedback" aria-live="polite">
            <p>{rolePlayResult.coachReply}</p>
            {captions ? rolePlayResult.captions.map((caption) => <small key={caption}>{caption}</small>) : null}
          </div>
        </section>

        <section id="lessons" className="side-section">
          <SectionHeader title="Lessons" icon={<BookOpenCheck size={18} aria-hidden="true" />} compact />
          <div className="lesson-list">
            {guidedLessons.map((lesson) => (
              <article key={lesson.id}>
                <strong>{lesson.title}</strong>
                <p>{lesson.objective}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="side-section" aria-labelledby="accessibility-title">
          <SectionHeader title="Accessibility" icon={<Accessibility size={18} aria-hidden="true" />} compact />
          <h2 id="accessibility-title" className="visually-hidden">
            Accessibility
          </h2>
          <label className="check-row">
            <input type="checkbox" checked={captions} onChange={(event) => setCaptions(event.target.checked)} />
            <span>Captions</span>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(event) => setReducedMotion(event.target.checked)}
            />
            <span>Reduced motion</span>
          </label>
          <label>
            <span className="field-label">Type size</span>
            <select value={typeScale} onChange={(event) => setTypeScale(event.target.value as typeof typeScale)}>
              <option value="standard">Standard</option>
              <option value="large">Large</option>
              <option value="extra-large">Extra large</option>
            </select>
          </label>
        </section>

        <section id="privacy" className="side-section safety-section">
          <SectionHeader title="Privacy center" icon={<ShieldCheck size={18} aria-hidden="true" />} compact />
          <div className="privacy-toggle-grid compact-toggles">
            <label className="check-row">
              <input
                type="checkbox"
                checked={saveHistory}
                onChange={(event) => setSaveHistory(event.target.checked)}
              />
              <span>Save practice history</span>
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={personalized}
                onChange={(event) => setPersonalized(event.target.checked)}
              />
              <span>Personalize recommendations</span>
            </label>
            <label className="check-row">
              <input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} />
              <span>Deidentified analytics</span>
            </label>
          </div>
          <div className="privacy-actions">
            <button type="button" className="secondary-action" onClick={exportData}>
              <Download size={16} aria-hidden="true" />
              Prepare export
            </button>
            <button type="button" className="secondary-action danger-action" onClick={deleteData}>
              <Trash2 size={16} aria-hidden="true" />
              Queue deletion
            </button>
          </div>
          <p className="privacy-status">
            Export: {privacyExport.id}. Deletion: {deletionRequest.status}.
          </p>
        </section>
      </aside>
    </main>
  );
}

function SectionHeader({
  title,
  titleId,
  description,
  icon,
  compact = false
}: {
  title: string;
  titleId?: string;
  description?: string;
  icon?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`section-title-row ${compact ? "compact" : ""}`}>
      <div>
        <h2 id={titleId}>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {icon ? <div className="section-icon">{icon}</div> : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function AccountPanel({
  accountEmail,
  authMode,
  onSignOut
}: {
  accountEmail?: string;
  authMode: "demo" | "signed-in";
  onSignOut?: () => Promise<void> | void;
}) {
  return (
    <section className="account-panel" aria-label="Account">
      <div>
        <span>{authMode === "demo" ? "Demo mode" : "Signed in"}</span>
        <strong>{accountEmail ?? "Private session"}</strong>
      </div>
      {onSignOut ? (
        <button className="mini-action" type="button" onClick={() => void onSignOut()}>
          <LogOut size={15} aria-hidden="true" />
          Sign out
        </button>
      ) : null}
    </section>
  );
}

function ScoreBars({ score, compact = false }: { score: FeedbackScore; compact?: boolean }) {
  const rows = [
    ["Clarity", score.clarity],
    ["Politeness", score.politeness],
    ["Assertiveness", score.assertiveness],
    ["Empathy", score.empathy],
    ["Boundary", score.boundarySpecificity],
    ["Regulation", score.emotionalRegulation]
  ] as const;

  return (
    <div className={`score-bars ${compact ? "compact-score" : ""}`} aria-label="Structured feedback scores">
      {rows.map(([label, value]) => (
        <div key={label} className="score-row">
          <span>{label}</span>
          <div className="score-track" aria-hidden="true">
            <div style={{ width: `${value}%` }} />
          </div>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}
