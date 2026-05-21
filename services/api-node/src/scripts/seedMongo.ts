import { getSettings } from "../config.js";
import { connectDatabase, disconnectDatabase } from "../db.js";
import { RuleBasedCoachProvider } from "../domain/coachProvider.js";
import { MongoRepository } from "../repositories/mongoRepository.js";

const settings = getSettings({ dataStore: "mongo" });
const userId = process.env.SEED_USER_ID?.trim() || "local-demo-user";
const repository = new MongoRepository();
const coachProvider = new RuleBasedCoachProvider();

await connectDatabase(settings);

try {
  const onboardingRequest = {
    ageRange: "18-plus" as const,
    consentAccepted: true,
    goals: ["boundaries", "workplace-confidence"] as const,
    privacyControls: {
      savePracticeHistory: true,
      allowPersonalizedRecommendations: true,
      allowDeidentifiedProductAnalytics: false
    },
    accessibility: {
      captions: true,
      reducedMotion: false,
      adjustableType: "standard" as const
    }
  };
  const onboarding = await coachProvider.completeOnboarding({
    ...onboardingRequest,
    goals: [...onboardingRequest.goals]
  });
  await repository.saveOnboarding(
    userId,
    {
      ...onboardingRequest,
      goals: [...onboardingRequest.goals]
    },
    onboarding
  );

  const assessmentRequest = {
    answers: [
      { questionId: "ask-directly", value: 3 },
      { questionId: "stay-kind", value: 4 },
      { questionId: "hold-boundary", value: 2 },
      { questionId: "regulate", value: 3 }
    ]
  };
  const assessment = await coachProvider.assessBaseline(assessmentRequest);
  await repository.saveAssessment(userId, assessmentRequest, assessment);

  const rewriteRequest = {
    inputText: "I guess it is okay if you keep changing the deadline.",
    relationship: "coworker" as const,
    tone: "warm-direct" as const,
    goal: "agree on a final deadline",
    context: "The project deadline has moved three times."
  };
  const rewrite = await coachProvider.rewriteMessage(rewriteRequest);
  await repository.saveRewrite(userId, rewriteRequest, rewrite);

  const rolePlayRequest = {
    scenarioId: "scenario-deadline",
    userMessage: "I need one final deadline so I can plan my work.",
    mode: "text" as const
  };
  const rolePlay = await coachProvider.rolePlay(rolePlayRequest);
  await repository.saveRolePlay(userId, rolePlayRequest, rolePlay);

  console.log(`Seeded SpeakAble Mongo demo state for ${userId}`);
} finally {
  await disconnectDatabase();
}
