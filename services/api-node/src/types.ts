import type {
  AnalyticsEventRequest,
  AnalyticsEventResponse,
  BaselineAssessmentRequest,
  BaselineAssessmentResponse,
  CoachRewriteRequest,
  CoachRewriteResponse,
  Lesson,
  ModerationReportRequest,
  ModerationReportResponse,
  OnboardingRequest,
  OnboardingResponse,
  PracticeScenario,
  PrivacyDeletionRequest,
  PrivacyDeletionResponse,
  PrivacyExportResponse,
  ProgressSummary,
  Recommendation,
  RolePlayRequest,
  RolePlayResponse
} from "@speakable/types";

export interface AuthenticatedUser {
  id: string;
  email?: string;
  authProvider: "local" | "jwt";
}

export interface AppRepository {
  ready(): Promise<boolean>;
  saveOnboarding(userId: string, request: OnboardingRequest, response: OnboardingResponse): Promise<void>;
  saveAssessment(
    userId: string,
    request: BaselineAssessmentRequest,
    response: BaselineAssessmentResponse
  ): Promise<void>;
  saveRewrite(userId: string, request: CoachRewriteRequest, response: CoachRewriteResponse): Promise<void>;
  saveRolePlay(userId: string, request: RolePlayRequest, response: RolePlayResponse): Promise<void>;
  listScenarios(category?: string): Promise<PracticeScenario[]>;
  listLessons(): Promise<Lesson[]>;
  getProgress(userId: string): Promise<ProgressSummary>;
  getRecommendations(userId: string): Promise<Recommendation[]>;
  createModerationReport(
    userId: string,
    request: ModerationReportRequest
  ): Promise<ModerationReportResponse>;
  createAnalyticsEvent(userId: string, request: AnalyticsEventRequest): Promise<AnalyticsEventResponse>;
  createPrivacyExport(userId: string): Promise<PrivacyExportResponse>;
  requestDeletion(userId: string, request: PrivacyDeletionRequest): Promise<PrivacyDeletionResponse>;
  reset?(): Promise<void>;
}

export interface StoredRewrite {
  id: string;
  createdAt: string;
  inputText?: string;
  context?: string;
  goal?: string;
  relationship?: string;
  tone?: string;
  assertiveText?: string;
  feedbackScore: CoachRewriteResponse["feedbackScore"];
  safetyFlags: string[];
  outputSafetyFlags: string[];
}

export interface StoredRolePlay {
  id: string;
  createdAt: string;
  scenarioId: string;
  mode: RolePlayRequest["mode"];
  userMessage?: string;
  coachReply?: string;
  score: RolePlayResponse["score"];
  safetyFlags: string[];
}

export interface StoredUserState {
  userId: string;
  onboarding?: {
    request: OnboardingRequest;
    response: OnboardingResponse;
    updatedAt: string;
  };
  latestAssessment?: {
    request: BaselineAssessmentRequest;
    response: BaselineAssessmentResponse;
    updatedAt: string;
  };
  rewrites: StoredRewrite[];
  rolePlays: StoredRolePlay[];
  moderationReports: ModerationReportResponse[];
  analyticsEvents: AnalyticsEventResponse[];
  privacyRequests: Array<PrivacyExportResponse | PrivacyDeletionResponse>;
  createdAt: string;
  updatedAt: string;
}
