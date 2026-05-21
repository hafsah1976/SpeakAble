import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
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

const userStateSchema = new mongoose.Schema<StoredUserState>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    onboarding: { type: mongoose.Schema.Types.Mixed },
    latestAssessment: { type: mongoose.Schema.Types.Mixed },
    rewrites: [{ type: mongoose.Schema.Types.Mixed }],
    rolePlays: [{ type: mongoose.Schema.Types.Mixed }],
    moderationReports: [{ type: mongoose.Schema.Types.Mixed }],
    analyticsEvents: [{ type: mongoose.Schema.Types.Mixed }],
    privacyRequests: [{ type: mongoose.Schema.Types.Mixed }],
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true }
  },
  { collection: "user_states", versionKey: false }
);

const UserStateModel =
  (mongoose.models.UserState as mongoose.Model<StoredUserState> | undefined) ??
  mongoose.model<StoredUserState>("UserState", userStateSchema);

export class MongoRepository implements AppRepository {
  async ready(): Promise<boolean> {
    return mongoose.connection.readyState === 1;
  }

  async saveOnboarding(userId: string, request: OnboardingRequest, response: OnboardingResponse): Promise<void> {
    const state = await this.getState(userId);
    state.onboarding = { request, response, updatedAt: new Date().toISOString() };
    await this.saveState(state);
  }

  async saveAssessment(
    userId: string,
    request: BaselineAssessmentRequest,
    response: BaselineAssessmentResponse
  ): Promise<void> {
    const state = await this.getState(userId);
    state.latestAssessment = { request, response, updatedAt: new Date().toISOString() };
    await this.saveState(state);
  }

  async saveRewrite(userId: string, request: CoachRewriteRequest, response: CoachRewriteResponse): Promise<void> {
    const state = await this.getState(userId);
    state.rewrites.push(sanitizeRewriteForStorage(state, request, response));
    await this.saveState(state);
  }

  async saveRolePlay(userId: string, request: RolePlayRequest, response: RolePlayResponse): Promise<void> {
    const state = await this.getState(userId);
    state.rolePlays.push(sanitizeRolePlayForStorage(state, request, response));
    await this.saveState(state);
  }

  async listScenarios(category?: string) {
    return category ? practiceScenarios.filter((item) => item.category === category) : practiceScenarios;
  }

  async listLessons() {
    return guidedLessons;
  }

  async getProgress(userId: string) {
    const state = await this.getState(userId);
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
    const state = await this.getState(userId);
    const response: ModerationReportResponse = {
      id: `report-${randomUUID()}`,
      status: "open",
      createdAt: new Date().toISOString()
    };

    state.moderationReports.push(response);
    await this.saveState(state);
    void request;
    return response;
  }

  async createAnalyticsEvent(userId: string, request: AnalyticsEventRequest): Promise<AnalyticsEventResponse> {
    const state = await this.getState(userId);
    const safeEvent = sanitizeAnalyticsProperties(request);
    const response: AnalyticsEventResponse = {
      accepted: true,
      eventId: `event-${randomUUID()}`,
      receivedAt: new Date().toISOString()
    };

    state.analyticsEvents.push(response);
    await this.saveState(state);
    void safeEvent;
    return response;
  }

  async createPrivacyExport(userId: string): Promise<PrivacyExportResponse> {
    const state = await this.getState(userId);
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
    await this.saveState(state);
    return response;
  }

  async requestDeletion(userId: string, request: PrivacyDeletionRequest): Promise<PrivacyDeletionResponse> {
    const current = await this.getState(userId);
    const createdAt = new Date();
    const response: PrivacyDeletionResponse = {
      id: `delete-${randomUUID()}`,
      status: "queued",
      createdAt: createdAt.toISOString(),
      estimatedCompletion: new Date(createdAt.getTime() + 1000 * 60 * 60 * 24 * 7).toISOString()
    };
    const nextState = applyDeletionRequest(current, request);

    nextState.privacyRequests.push(response);
    await this.saveState(nextState);
    return response;
  }

  private async getState(userId: string): Promise<StoredUserState> {
    const existing = await UserStateModel.findOne({ userId }).lean<StoredUserState>().exec();
    if (existing) {
      return {
        ...existing,
        rewrites: existing.rewrites ?? [],
        rolePlays: existing.rolePlays ?? [],
        moderationReports: existing.moderationReports ?? [],
        analyticsEvents: existing.analyticsEvents ?? [],
        privacyRequests: existing.privacyRequests ?? []
      };
    }

    const state = createStoredUserState(userId);
    await UserStateModel.create(state);
    return state;
  }

  private async saveState(state: StoredUserState): Promise<void> {
    state.updatedAt = new Date().toISOString();
    await UserStateModel.updateOne({ userId: state.userId }, { $set: state }, { upsert: true }).exec();
  }
}
