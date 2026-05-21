import type { RequestHandler } from "express";
import { z } from "zod";

export const privacyControlsSchema = z.object({
  savePracticeHistory: z.boolean(),
  allowPersonalizedRecommendations: z.boolean(),
  allowDeidentifiedProductAnalytics: z.boolean()
});

export const onboardingRequestSchema = z.object({
  ageRange: z.enum(["under-13", "13-15", "16-17", "18-plus"]),
  consentAccepted: z.boolean(),
  goals: z.array(
    z.enum([
      "clearer-asks",
      "boundaries",
      "hard-feedback",
      "less-apologizing",
      "conflict-repair",
      "workplace-confidence"
    ])
  ),
  privacyControls: privacyControlsSchema,
  accessibility: z.object({
    captions: z.boolean(),
    reducedMotion: z.boolean(),
    adjustableType: z.enum(["standard", "large", "extra-large"])
  })
});

export const assessmentRequestSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().min(1).max(80),
      value: z.number().int().min(1).max(5)
    })
  )
});

export const coachRewriteRequestSchema = z.object({
  inputText: z.string().min(1).max(4000),
  relationship: z.enum(["coworker", "manager", "friend", "partner", "family", "service-provider", "other"]),
  tone: z.enum(["warm-direct", "firm-boundary", "repair", "curious"]),
  goal: z.string().min(1).max(400),
  context: z.string().max(1200).optional()
});

export const rolePlayRequestSchema = z.object({
  scenarioId: z.string().min(1).max(120),
  userMessage: z.string().min(1).max(3000),
  mode: z.enum(["text", "voice"])
});

export const moderationReportRequestSchema = z.object({
  subjectType: z.enum(["coach_message", "practice_attempt", "scenario", "other"]),
  subjectId: z.string().max(160).optional(),
  reason: z.string().min(1).max(300),
  details: z.string().max(1200).optional()
});

export const privacyDeletionRequestSchema = z.object({
  deletePracticeHistory: z.boolean(),
  deleteAssessment: z.boolean(),
  deleteAccount: z.boolean()
});

export const analyticsEventRequestSchema = z.object({
  name: z.enum([
    "onboarding_saved",
    "baseline_assessment_submitted",
    "coach_rewrite_requested",
    "role_play_turn_submitted",
    "privacy_export_requested",
    "privacy_deletion_requested",
    "moderation_report_submitted",
    "accessibility_preference_changed"
  ]),
  source: z.enum(["web", "mobile", "api"]),
  properties: z
    .object({
      surface: z.string().max(80).optional(),
      mode: z.enum(["text", "voice"]).optional(),
      goalCount: z.number().int().min(0).max(20).optional(),
      safetyFlagCount: z.number().int().min(0).max(20).optional(),
      scoreBucket: z.enum(["low", "medium", "high"]).optional(),
      featureFlag: z.string().max(80).optional(),
      preference: z.string().max(80).optional()
    })
    .optional()
});

export function validateBody(schema: z.ZodType): RequestHandler {
  return (request, _response, next) => {
    request.body = schema.parse(request.body);
    next();
  };
}
