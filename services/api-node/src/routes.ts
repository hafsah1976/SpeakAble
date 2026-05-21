import { Router } from "express";
import { asyncHandler } from "./errors.js";
import type { CoachProvider } from "./domain/coachProvider.js";
import type { AppRepository } from "./types.js";
import {
  analyticsEventRequestSchema,
  assessmentRequestSchema,
  coachRewriteRequestSchema,
  moderationReportRequestSchema,
  onboardingRequestSchema,
  privacyDeletionRequestSchema,
  rolePlayRequestSchema,
  validateBody
} from "./validation.js";

export function createV1Router(repository: AppRepository, coachProvider: CoachProvider): Router {
  const router = Router();

  router.post(
    "/onboarding",
    validateBody(onboardingRequestSchema),
    asyncHandler(async (request, response) => {
      const body = onboardingRequestSchema.parse(request.body);
      const result = await coachProvider.completeOnboarding(body);
      await repository.saveOnboarding(requireUserId(request), body, result);
      response.json(result);
    })
  );

  router.post(
    "/assessment/baseline",
    validateBody(assessmentRequestSchema),
    asyncHandler(async (request, response) => {
      const body = assessmentRequestSchema.parse(request.body);
      const result = await coachProvider.assessBaseline(body);
      await repository.saveAssessment(requireUserId(request), body, result);
      response.json(result);
    })
  );

  router.post(
    "/coach/rewrite",
    validateBody(coachRewriteRequestSchema),
    asyncHandler(async (request, response) => {
      const body = coachRewriteRequestSchema.parse(request.body);
      const result = await coachProvider.rewriteMessage(body);
      await repository.saveRewrite(requireUserId(request), body, result);
      response.json(result);
    })
  );

  router.get(
    "/scenarios",
    asyncHandler(async (request, response) => {
      const category = typeof request.query.category === "string" ? request.query.category : undefined;
      response.json(await repository.listScenarios(category));
    })
  );

  router.get(
    "/progress",
    asyncHandler(async (request, response) => {
      response.json(await repository.getProgress(requireUserId(request)));
    })
  );

  router.get(
    "/lessons",
    asyncHandler(async (_request, response) => {
      response.json(await repository.listLessons());
    })
  );

  router.post(
    "/role-play",
    validateBody(rolePlayRequestSchema),
    asyncHandler(async (request, response) => {
      const body = rolePlayRequestSchema.parse(request.body);
      const result = await coachProvider.rolePlay(body);
      await repository.saveRolePlay(requireUserId(request), body, result);
      response.json(result);
    })
  );

  router.get(
    "/recommendations",
    asyncHandler(async (request, response) => {
      response.json(await repository.getRecommendations(requireUserId(request)));
    })
  );

  router.post(
    "/moderation/reports",
    validateBody(moderationReportRequestSchema),
    asyncHandler(async (request, response) => {
      const body = moderationReportRequestSchema.parse(request.body);
      response.json(await repository.createModerationReport(requireUserId(request), body));
    })
  );

  router.post(
    "/privacy/export",
    asyncHandler(async (request, response) => {
      response.json(await repository.createPrivacyExport(requireUserId(request)));
    })
  );

  router.post(
    "/privacy/delete",
    validateBody(privacyDeletionRequestSchema),
    asyncHandler(async (request, response) => {
      const body = privacyDeletionRequestSchema.parse(request.body);
      response.json(await repository.requestDeletion(requireUserId(request), body));
    })
  );

  router.post(
    "/analytics/events",
    validateBody(analyticsEventRequestSchema),
    asyncHandler(async (request, response) => {
      const body = analyticsEventRequestSchema.parse(request.body);
      response.json(await repository.createAnalyticsEvent(requireUserId(request), body));
    })
  );

  return router;
}

function requireUserId(request: Express.Request): string {
  return request.user?.id ?? "local-demo-user";
}
