import { randomUUID } from "node:crypto";
import type {
  AnalyticsEventRequest,
  AnalyticsEventResponse,
  BaselineAssessmentRequest,
  BaselineAssessmentResponse,
  CoachRewriteRequest,
  CoachRewriteResponse,
  ModerationReportRequest,
  ModerationReportResponse,
  OnboardingRequest,
  OnboardingResponse,
  PrivacyDeletionRequest,
  PrivacyDeletionResponse,
  PrivacyExportResponse,
  RolePlayRequest,
  RolePlayResponse
} from "@speakable/types";
import { defaultRecommendations, emptyProgress, guidedLessons, practiceScenarios } from "../domain/content.js";
import type { AppRepository, StoredUserState } from "../types.js";
import {
  applyDeletionRequest,
  createStoredUserState,
  sanitizeAnalyticsProperties,
  sanitizeRewriteForStorage,
  sanitizeRolePlayForStorage
} from "./state.js";

export class MemoryRepository implements AppRepository {
  private states = new Map<string, StoredUserState>();

  async ready(): Promise<boolean> {
    return true;
  }

  async saveOnboarding(userId: string, request: OnboardingRequest, response: OnboardingResponse): Promise<void> {
    const state = this.getState(userId);
    state.onboarding = { request, response, updatedAt: new Date().toISOString() };
    this.saveState(state);
  }

  async saveAssessment(
    userId: string,
    request: BaselineAssessmentRequest,
    response: BaselineAssessmentResponse
  ): Promise<void> {
    const state = this.getState(userId);
    state.latestAssessment = { request, response, updatedAt: new Date().toISOString() };
    this.saveState(state);
  }

  async saveRewrite(userId: string, request: CoachRewriteRequest, response: CoachRewriteResponse): Promise<void> {
    const state = this.getState(userId);
    state.rewrites.push(sanitizeRewriteForStorage(state, request, response));
    this.saveState(state);
  }

  async saveRolePlay(userId: string, request: RolePlayRequest, response: RolePlayResponse): Promise<void> {
    const state = this.getState(userId);
    state.rolePlays.push(sanitizeRolePlayForStorage(state, request, response));
    this.saveState(state);
  }

  async listScenarios(category?: string) {
    return category ? practiceScenarios.filter((item) => item.category === category) : practiceScenarios;
  }

  async listLessons() {
    return guidedLessons;
  }

  async getProgress(userId: string) {
    const state = this.getState(userId);
    const activityCount = state.rewrites.length + state.rolePlays.length;

    return {
      ...emptyProgress,
      streakDays: activityCount > 0 ? 1 : 0,
      rewritesThisWeek: state.rewrites.length,
      savedPhrases: state.rewrites.filter((item) => item.assertiveText).length,
      strongestSkill: (state.latestAssessment?.response.score.clarity ?? 0) >= 80 ? "Clear asks" : "Kind tone",
      nextSkill:
        state.latestAssessment?.response.style === "accommodating" ? "Shorter boundaries" : "Precision under pressure",
      recommendations: defaultRecommendations
    };
  }

  async getRecommendations() {
    return defaultRecommendations;
  }

  async createModerationReport(userId: string, request: ModerationReportRequest): Promise<ModerationReportResponse> {
    const state = this.getState(userId);
    const response: ModerationReportResponse = {
      id: `report-${randomUUID()}`,
      status: "open",
      createdAt: new Date().toISOString()
    };

    state.moderationReports.push(response);
    this.saveState(state);
    void request;
    return response;
  }

  async createAnalyticsEvent(userId: string, request: AnalyticsEventRequest): Promise<AnalyticsEventResponse> {
    const state = this.getState(userId);
    const safeEvent = sanitizeAnalyticsProperties(request);
    const response: AnalyticsEventResponse = {
      accepted: true,
      eventId: `event-${randomUUID()}`,
      receivedAt: new Date().toISOString()
    };

    state.analyticsEvents.push(response);
    this.saveState(state);
    void safeEvent;
    return response;
  }

  async createPrivacyExport(userId: string): Promise<PrivacyExportResponse> {
    const state = this.getState(userId);
    const response: PrivacyExportResponse = {
      id: `export-${randomUUID()}`,
      generatedAt: new Date().toISOString(),
      format: "json",
      includes: [
        "profile",
        "privacyControls",
        "assessmentSummary",
        "coachSessions",
        "rolePlaySessions",
        "reports"
      ]
    };

    state.privacyRequests.push(response);
    this.saveState(state);
    return response;
  }

  async requestDeletion(userId: string, request: PrivacyDeletionRequest): Promise<PrivacyDeletionResponse> {
    const current = this.getState(userId);
    const createdAt = new Date();
    const response: PrivacyDeletionResponse = {
      id: `delete-${randomUUID()}`,
      status: "queued",
      createdAt: createdAt.toISOString(),
      estimatedCompletion: new Date(createdAt.getTime() + 1000 * 60 * 60 * 24 * 7).toISOString()
    };
    const nextState = applyDeletionRequest(current, request);

    nextState.privacyRequests.push(response);
    this.saveState(nextState);
    return response;
  }

  async reset(): Promise<void> {
    this.states.clear();
  }

  private getState(userId: string): StoredUserState {
    const state = this.states.get(userId);
    if (state) {
      return state;
    }

    const nextState = createStoredUserState(userId);
    this.states.set(userId, nextState);
    return nextState;
  }

  private saveState(state: StoredUserState): void {
    state.updatedAt = new Date().toISOString();
    this.states.set(state.userId, state);
  }
}
