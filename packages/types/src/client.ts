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
} from "./contracts";
import {
  buildAssessmentResult,
  buildLocalCoachingResponse,
  buildPrivacyExport,
  buildRolePlayResponse,
  completeLocalOnboarding,
  demoProgress,
  demoRecommendations,
  guidedLessons,
  practiceScenarios,
  queuePrivacyDeletion
} from "./localCoach";

export interface AssertiveCoachClientOptions {
  baseUrl?: string;
  allowLocalDemoFallback?: boolean;
  getAccessToken?: () => Promise<string | undefined> | string | undefined;
}

export function createAssertiveCoachClient(options: AssertiveCoachClientOptions = {}) {
  const baseUrl = options.baseUrl?.replace(/\/$/, "");
  const allowLocalDemoFallback = options.allowLocalDemoFallback === true;

  function canUseLocalDemoFallback() {
    return !baseUrl && allowLocalDemoFallback;
  }

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    if (!baseUrl) {
      throw new Error("API base URL is not configured and local demo fallback is disabled.");
    }

    const token = await options.getAccessToken?.();
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers
      }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `Request failed with ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  return {
    async completeOnboarding(payload: OnboardingRequest): Promise<OnboardingResponse> {
      if (canUseLocalDemoFallback()) {
        return completeLocalOnboarding(payload);
      }

      return request<OnboardingResponse>("/v1/onboarding", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },

    async submitAssessment(payload: BaselineAssessmentRequest): Promise<BaselineAssessmentResponse> {
      if (canUseLocalDemoFallback()) {
        return buildAssessmentResult(payload);
      }

      return request<BaselineAssessmentResponse>("/v1/assessment/baseline", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },

    async rewriteMessage(payload: CoachRewriteRequest): Promise<CoachRewriteResponse> {
      if (canUseLocalDemoFallback()) {
        return buildLocalCoachingResponse(payload);
      }

      return request<CoachRewriteResponse>("/v1/coach/rewrite", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },

    async listScenarios(): Promise<PracticeScenario[]> {
      if (canUseLocalDemoFallback()) {
        return practiceScenarios;
      }

      return request<PracticeScenario[]>("/v1/scenarios");
    },

    async getProgress(): Promise<ProgressSummary> {
      if (canUseLocalDemoFallback()) {
        return demoProgress;
      }

      return request<ProgressSummary>("/v1/progress");
    },

    async listLessons(): Promise<Lesson[]> {
      if (canUseLocalDemoFallback()) {
        return guidedLessons;
      }

      return request<Lesson[]>("/v1/lessons");
    },

    async rolePlay(payload: RolePlayRequest): Promise<RolePlayResponse> {
      if (canUseLocalDemoFallback()) {
        return buildRolePlayResponse(payload);
      }

      return request<RolePlayResponse>("/v1/role-play", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },

    async getRecommendations(): Promise<Recommendation[]> {
      if (canUseLocalDemoFallback()) {
        return demoRecommendations;
      }

      return request<Recommendation[]>("/v1/recommendations");
    },

    async createReport(payload: ModerationReportRequest): Promise<ModerationReportResponse> {
      if (canUseLocalDemoFallback()) {
        return {
          id: `local-report-${Date.now()}`,
          status: "open",
          createdAt: new Date().toISOString()
        };
      }

      return request<ModerationReportResponse>("/v1/moderation/reports", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },

    async exportPrivacyData(): Promise<PrivacyExportResponse> {
      if (canUseLocalDemoFallback()) {
        return buildPrivacyExport();
      }

      return request<PrivacyExportResponse>("/v1/privacy/export", {
        method: "POST"
      });
    },

    async requestDeletion(payload: PrivacyDeletionRequest): Promise<PrivacyDeletionResponse> {
      if (canUseLocalDemoFallback()) {
        return queuePrivacyDeletion(payload);
      }

      return request<PrivacyDeletionResponse>("/v1/privacy/delete", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },

    async trackEvent(payload: AnalyticsEventRequest): Promise<AnalyticsEventResponse> {
      if (canUseLocalDemoFallback()) {
        return {
          accepted: true,
          eventId: `local-event-${Date.now()}`,
          receivedAt: new Date().toISOString()
        };
      }

      return request<AnalyticsEventResponse>("/v1/analytics/events", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }
  };
}
