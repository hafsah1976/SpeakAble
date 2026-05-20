export type CoachTone = "warm-direct" | "firm-boundary" | "repair" | "curious";

export type Relationship =
  | "coworker"
  | "manager"
  | "friend"
  | "partner"
  | "family"
  | "service-provider"
  | "other";

export type PracticeDifficulty = "starter" | "steady" | "stretch";
export type AgeRange = "under-13" | "13-15" | "16-17" | "18-plus";
export type CommunicationGoal =
  | "clearer-asks"
  | "boundaries"
  | "hard-feedback"
  | "less-apologizing"
  | "conflict-repair"
  | "workplace-confidence";

export interface FeatureFlags {
  voiceRolePlay: boolean;
  externalSharing: boolean;
}

export interface PrivacyControls {
  savePracticeHistory: boolean;
  allowPersonalizedRecommendations: boolean;
  allowDeidentifiedProductAnalytics: boolean;
}

export interface OnboardingRequest {
  ageRange: AgeRange;
  consentAccepted: boolean;
  goals: CommunicationGoal[];
  privacyControls: PrivacyControls;
  accessibility: {
    captions: boolean;
    reducedMotion: boolean;
    adjustableType: "standard" | "large" | "extra-large";
  };
}

export interface OnboardingResponse {
  completed: boolean;
  nextStep: "assessment" | "coach";
  privacyControls: PrivacyControls;
}

export interface CoachRewriteRequest {
  inputText: string;
  relationship: Relationship;
  tone: CoachTone;
  goal: string;
  context?: string;
}

export interface CoachingNote {
  label: string;
  detail: string;
}

export interface CoachRewriteResponse {
  id: string;
  assertiveText: string;
  coachingNotes: CoachingNote[];
  feedbackScore: FeedbackScore;
  safetyFlags: string[];
  outputSafetyFlags: string[];
  suggestedPractice: string[];
  createdAt: string;
}

export interface PracticeScenario {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: PracticeDifficulty;
  category: string;
  prompt: string;
}

export interface PracticeAttemptRequest {
  scenarioId: string;
  draftText: string;
}

export interface PracticeAttemptResponse {
  id: string;
  score: FeedbackScore;
  notes: CoachingNote[];
  createdAt: string;
}

export interface FeedbackScore {
  clarity: number;
  politeness: number;
  assertiveness: number;
  empathy: number;
  boundarySpecificity: number;
  emotionalRegulation: number;
}

export interface ProgressSummary {
  streakDays: number;
  rewritesThisWeek: number;
  savedPhrases: number;
  strongestSkill: string;
  nextSkill: string;
  recommendations: Recommendation[];
}

export interface BaselineAssessmentQuestion {
  id: string;
  prompt: string;
  lowLabel: string;
  highLabel: string;
}

export interface BaselineAssessmentRequest {
  answers: Array<{
    questionId: string;
    value: number;
  }>;
}

export interface BaselineAssessmentResponse {
  style: "accommodating" | "direct" | "avoidant" | "balanced" | "intense";
  summary: string;
  score: FeedbackScore;
  recommendedLessonIds: string[];
}

export interface LessonExercise {
  id: string;
  prompt: string;
  exampleAnswer: string;
}

export interface Lesson {
  id: string;
  title: string;
  objective: string;
  example: {
    before: string;
    after: string;
  };
  exercises: LessonExercise[];
  estimatedMinutes: number;
}

export interface RolePlayRequest {
  scenarioId: string;
  userMessage: string;
  mode: "text" | "voice";
}

export interface RolePlayResponse {
  id: string;
  coachReply: string;
  captions: string[];
  score: FeedbackScore;
  safetyFlags: string[];
  nextPrompt: string;
  voiceEnabled: boolean;
  createdAt: string;
}

export interface Recommendation {
  id: string;
  title: string;
  reason: string;
  action: string;
  priority: "low" | "medium" | "high";
}

export type ReportSubjectType = "coach_message" | "practice_attempt" | "scenario" | "other";

export interface ModerationReportRequest {
  subjectType: ReportSubjectType;
  subjectId?: string;
  reason: string;
  details?: string;
}

export interface ModerationReportResponse {
  id: string;
  status: "open" | "triaged" | "resolved" | "dismissed";
  createdAt: string;
}

export interface PrivacyExportResponse {
  id: string;
  generatedAt: string;
  format: "json";
  downloadUrl?: string;
  includes: string[];
}

export interface PrivacyDeletionRequest {
  deletePracticeHistory: boolean;
  deleteAssessment: boolean;
  deleteAccount: boolean;
}

export interface PrivacyDeletionResponse {
  id: string;
  status: "queued" | "completed";
  createdAt: string;
  estimatedCompletion: string;
}

export type AnalyticsEventName =
  | "onboarding_saved"
  | "baseline_assessment_submitted"
  | "coach_rewrite_requested"
  | "role_play_turn_submitted"
  | "privacy_export_requested"
  | "privacy_deletion_requested"
  | "moderation_report_submitted"
  | "accessibility_preference_changed";

export interface AnalyticsEventRequest {
  name: AnalyticsEventName;
  source: "web" | "mobile" | "api";
  properties?: {
    surface?: string;
    mode?: "text" | "voice";
    goalCount?: number;
    safetyFlagCount?: number;
    scoreBucket?: "low" | "medium" | "high";
    featureFlag?: string;
    preference?: string;
  };
}

export interface AnalyticsEventResponse {
  accepted: boolean;
  eventId: string;
  receivedAt: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
