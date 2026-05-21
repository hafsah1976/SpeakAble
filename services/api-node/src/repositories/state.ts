import type {
  AnalyticsEventRequest,
  CoachRewriteRequest,
  CoachRewriteResponse,
  OnboardingRequest,
  PrivacyDeletionRequest,
  RolePlayRequest,
  RolePlayResponse
} from "@speakable/types";
import type { StoredRolePlay, StoredRewrite, StoredUserState } from "../types.js";

export function createStoredUserState(userId: string): StoredUserState {
  const now = new Date().toISOString();

  return {
    userId,
    rewrites: [],
    rolePlays: [],
    moderationReports: [],
    analyticsEvents: [],
    privacyRequests: [],
    createdAt: now,
    updatedAt: now
  };
}

export function shouldSavePracticeHistory(state: StoredUserState): boolean {
  return state.onboarding?.request.privacyControls.savePracticeHistory ?? true;
}

export function sanitizeRewriteForStorage(
  state: StoredUserState,
  request: CoachRewriteRequest,
  response: CoachRewriteResponse
): StoredRewrite {
  const savePracticeHistory = shouldSavePracticeHistory(state);

  return {
    id: response.id,
    createdAt: response.createdAt,
    inputText: savePracticeHistory ? request.inputText : undefined,
    context: savePracticeHistory ? request.context : undefined,
    goal: savePracticeHistory ? request.goal : undefined,
    relationship: savePracticeHistory ? request.relationship : undefined,
    tone: savePracticeHistory ? request.tone : undefined,
    assertiveText: savePracticeHistory ? response.assertiveText : undefined,
    feedbackScore: response.feedbackScore,
    safetyFlags: response.safetyFlags,
    outputSafetyFlags: response.outputSafetyFlags
  };
}

export function sanitizeRolePlayForStorage(
  state: StoredUserState,
  request: RolePlayRequest,
  response: RolePlayResponse
): StoredRolePlay {
  const savePracticeHistory = shouldSavePracticeHistory(state);

  return {
    id: response.id,
    createdAt: response.createdAt,
    scenarioId: request.scenarioId,
    mode: request.mode,
    userMessage: savePracticeHistory ? request.userMessage : undefined,
    coachReply: savePracticeHistory ? response.coachReply : undefined,
    score: response.score,
    safetyFlags: response.safetyFlags
  };
}

export function applyDeletionRequest(state: StoredUserState, request: PrivacyDeletionRequest): StoredUserState {
  if (request.deleteAccount) {
    return createStoredUserState(state.userId);
  }

  if (request.deletePracticeHistory) {
    state.rewrites = [];
    state.rolePlays = [];
  }

  if (request.deleteAssessment) {
    state.latestAssessment = undefined;
  }

  state.updatedAt = new Date().toISOString();
  return state;
}

export function sanitizeAnalyticsProperties(request: AnalyticsEventRequest): AnalyticsEventRequest {
  return {
    name: request.name,
    source: request.source,
    properties: request.properties
      ? {
          surface: request.properties.surface,
          mode: request.properties.mode,
          goalCount: request.properties.goalCount,
          safetyFlagCount: request.properties.safetyFlagCount,
          scoreBucket: request.properties.scoreBucket,
          featureFlag: request.properties.featureFlag,
          preference: request.properties.preference
        }
      : undefined
  };
}
