import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { tokenMatchesExpectedAudience } from "../src/auth.js";
import { MemoryRepository } from "../src/repositories/memoryRepository.js";

function makeTestApp() {
  const repository = new MemoryRepository();
  return {
    app: createApp({
      repository,
      settings: {
        nodeEnv: "test",
        authRequired: false,
        dataStore: "memory",
        corsOrigins: ["http://localhost:3000"]
      }
    }),
    repository
  };
}

describe("SpeakAble MERN API", () => {
  let testApp: ReturnType<typeof makeTestApp>;

  beforeEach(() => {
    testApp = makeTestApp();
  });

  it("reports health and readiness", async () => {
    const health = await request(testApp.app).get("/health").expect(200);
    expect(health.body.status).toBe("ok");
    expect(health.body.runtime).toBeUndefined();

    const ready = await request(testApp.app).get("/ready").expect(200);
    expect(ready.body.status).toBe("ready");
    expect(ready.body.checks.database).toBe("ok");
  });

  it("returns the OpenAPI document without implementation notes", async () => {
    const response = await request(testApp.app).get("/openapi.json").expect(200);

    expect(response.body.openapi).toBe("3.1.0");
    expect(JSON.stringify(response.body)).not.toContain("MongoDB connection");
  });

  it("runs the launch demo journey and persists progress", async () => {
    await request(testApp.app)
      .post("/v1/onboarding")
      .send({
        ageRange: "18-plus",
        consentAccepted: true,
        goals: ["boundaries", "workplace-confidence"],
        privacyControls: {
          savePracticeHistory: true,
          allowPersonalizedRecommendations: true,
          allowDeidentifiedProductAnalytics: false
        },
        accessibility: {
          captions: true,
          reducedMotion: false,
          adjustableType: "standard"
        }
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.completed).toBe(true);
      });

    await request(testApp.app)
      .post("/v1/assessment/baseline")
      .send({
        answers: [
          { questionId: "ask-directly", value: 3 },
          { questionId: "stay-kind", value: 4 },
          { questionId: "hold-boundary", value: 2 },
          { questionId: "regulate", value: 3 }
        ]
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.style).toBe("accommodating");
      });

    await request(testApp.app)
      .post("/v1/coach/rewrite")
      .send({
        inputText: "I guess it is okay if you keep changing the deadline.",
        relationship: "coworker",
        tone: "warm-direct",
        goal: "agree on a final deadline",
        context: "The project deadline has moved three times."
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.assertiveText).toContain("My request is: agree on a final deadline.");
        expect(response.body.feedbackScore.clarity).toBeGreaterThanOrEqual(80);
      });

    await request(testApp.app)
      .post("/v1/role-play")
      .send({
        scenarioId: "scenario-deadline",
        userMessage: "I need one final deadline so I can plan my work.",
        mode: "text"
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.voiceEnabled).toBe(false);
      });

    const progress = await request(testApp.app).get("/v1/progress").expect(200);
    expect(progress.body.rewritesThisWeek).toBe(1);
    expect(progress.body.savedPhrases).toBe(1);
    expect(progress.body.streakDays).toBe(1);
  });

  it("blocks safety-sensitive polished outputs before display", async () => {
    const response = await request(testApp.app)
      .post("/v1/coach/rewrite")
      .send({
        inputText: "I am afraid of them and feel unsafe at home.",
        relationship: "partner",
        tone: "firm-boundary",
        goal: "get support",
        context: "I feel unsafe at home."
      })
      .expect(200);

    expect(response.body.safetyFlags).toContain("personal-safety");
    expect(response.body.assertiveText).toContain("cannot provide a polished message");
  });

  it("filters scenarios and serves lessons", async () => {
    const scenarios = await request(testApp.app).get("/v1/scenarios?category=work").expect(200);
    expect(scenarios.body.every((item: { category: string }) => item.category === "work")).toBe(true);

    const lessons = await request(testApp.app).get("/v1/lessons").expect(200);
    expect(lessons.body.length).toBeGreaterThanOrEqual(3);
  });

  it("accepts privacy-safe analytics and moderation reports", async () => {
    const event = await request(testApp.app)
      .post("/v1/analytics/events")
      .send({
        name: "coach_rewrite_requested",
        source: "web",
        properties: {
          surface: "coach",
          safetyFlagCount: 0,
          scoreBucket: "high"
        }
      })
      .expect(200);

    expect(event.body.accepted).toBe(true);

    const report = await request(testApp.app)
      .post("/v1/moderation/reports")
      .send({
        subjectType: "coach_message",
        subjectId: "rewrite-1",
        reason: "Needs review"
      })
      .expect(200);

    expect(report.body.status).toBe("open");
  });

  it("exports and deletes privacy-scoped data", async () => {
    await request(testApp.app)
      .post("/v1/coach/rewrite")
      .send({
        inputText: "I guess this is okay.",
        relationship: "coworker",
        tone: "warm-direct",
        goal: "ask for a clearer next step",
        context: "A teammate changed the plan."
      })
      .expect(200);

    const exportResponse = await request(testApp.app).post("/v1/privacy/export").expect(200);
    expect(exportResponse.body.includes).toContain("coachSessions");
    expect(exportResponse.body.includes).toContain("rolePlaySessions");

    const deletion = await request(testApp.app)
      .post("/v1/privacy/delete")
      .send({ deletePracticeHistory: true, deleteAssessment: true, deleteAccount: false })
      .expect(200);
    expect(deletion.body.status).toBe("queued");

    const progress = await request(testApp.app).get("/v1/progress").expect(200);
    expect(progress.body.rewritesThisWeek).toBe(0);
    expect(progress.body.savedPhrases).toBe(0);
  });

  it("does not expose backend notes in validation errors", async () => {
    const response = await request(testApp.app).post("/v1/coach/rewrite").send({}).expect(422);
    const body = JSON.stringify(response.body);

    expect(response.body.error.message).toBe("The request could not be processed.");
    expect(body).not.toMatch(/zod|express|mongo|mongoose|stack|trace|cognito|aws/i);
  });

  it("matches JWT audience and Cognito access-token client ids", () => {
    expect(tokenMatchesExpectedAudience({ aud: "speakable-client" }, "speakable-client")).toBe(true);
    expect(tokenMatchesExpectedAudience({ client_id: "speakable-client" }, "speakable-client")).toBe(true);
    expect(tokenMatchesExpectedAudience({ client_id: "other-client" }, "speakable-client")).toBe(false);
  });
});
