import { randomUUID } from "node:crypto";
import type {
  BaselineAssessmentRequest,
  BaselineAssessmentResponse,
  CoachRewriteRequest,
  CoachRewriteResponse,
  FeedbackScore,
  OnboardingRequest,
  OnboardingResponse,
  RolePlayRequest,
  RolePlayResponse
} from "@speakable/types";
import { practiceScenarios } from "./content.js";

export interface CoachProvider {
  completeOnboarding(request: OnboardingRequest): Promise<OnboardingResponse>;
  assessBaseline(request: BaselineAssessmentRequest): Promise<BaselineAssessmentResponse>;
  rewriteMessage(request: CoachRewriteRequest): Promise<CoachRewriteResponse>;
  rolePlay(request: RolePlayRequest): Promise<RolePlayResponse>;
}

export class RuleBasedCoachProvider implements CoachProvider {
  async completeOnboarding(request: OnboardingRequest): Promise<OnboardingResponse> {
    if (request.ageRange === "under-13" || !request.consentAccepted) {
      return {
        completed: false,
        nextStep: "assessment",
        privacyControls: request.privacyControls
      };
    }

    return {
      completed: true,
      nextStep: request.goals.length > 0 ? "assessment" : "coach",
      privacyControls: request.privacyControls
    };
  }

  async assessBaseline(request: BaselineAssessmentRequest): Promise<BaselineAssessmentResponse> {
    const average =
      request.answers.reduce((sum, answer) => sum + answer.value, 0) / Math.max(request.answers.length, 1);
    const boundary = request.answers.find((answer) => answer.questionId === "hold-boundary")?.value ?? average;
    const regulation = request.answers.find((answer) => answer.questionId === "regulate")?.value ?? average;
    const style =
      average >= 4 && boundary >= 4
        ? "balanced"
        : boundary <= 2
          ? "accommodating"
          : regulation <= 2
            ? "intense"
            : "avoidant";

    return {
      style,
      summary:
        style === "balanced"
          ? "You already have a solid base. Your next growth edge is precision under pressure."
          : "Your plan should focus on short, specific asks and a pause before high-stakes replies.",
      score: {
        clarity: Math.round(average * 18),
        politeness: 82,
        assertiveness: Math.round(boundary * 18),
        empathy: 78,
        boundarySpecificity: Math.round(boundary * 17),
        emotionalRegulation: Math.round(regulation * 18)
      },
      recommendedLessonIds: boundary <= 3 ? ["lesson-boundary", "lesson-i-statement"] : ["lesson-repair"]
    };
  }

  async rewriteMessage(request: CoachRewriteRequest): Promise<CoachRewriteResponse> {
    const safetyFlags = detectSafetyFlags(request.inputText);
    const blocked = shouldBlockDisplay(safetyFlags);
    const assertiveText = blocked ? blockedSafetyMessage : buildAssertiveText(request);
    const outputSafetyFlags = detectSafetyFlags(assertiveText);
    const feedbackScore = scoreMessage(assertiveText);
    const relationship = request.relationship.replace("-", " ");

    return {
      id: `rewrite-${randomUUID()}`,
      assertiveText,
      coachingNotes: blocked
        ? [
            {
              label: "Pause before sending",
              detail: "This situation may need support or a safety plan before direct messaging."
            },
            {
              label: "Use a lower-risk next step",
              detail: "Choose a trusted person, local service, or safer channel before confrontation."
            }
          ]
        : [
            {
              label: "Start with respect",
              detail: `Names the conversation with your ${relationship} without blame.`
            },
            {
              label: "Use an I statement",
              detail: "Centers your need and request instead of diagnosing the other person."
            },
            {
              label: "Make the ask concrete",
              detail: "A clear next step is easier to agree to than a general frustration."
            }
          ],
      feedbackScore,
      safetyFlags,
      outputSafetyFlags,
      suggestedPractice: blocked
        ? [
            "Do not send a message if it could increase immediate risk.",
            "Write down one safe next step you can take offline."
          ]
        : [
            "Read it once out loud and remove any sentence you would not actually say.",
            "Keep the request to one concrete action.",
            "If your body feels tense, pause before sending and shorten the opening."
          ],
      createdAt: new Date().toISOString()
    };
  }

  async rolePlay(request: RolePlayRequest): Promise<RolePlayResponse> {
    const scenario = practiceScenarios.find((item) => item.id === request.scenarioId) ?? practiceScenarios[0];
    const safetyFlags = detectSafetyFlags(request.userMessage);
    const blocked = shouldBlockDisplay(safetyFlags);
    const score = scoreMessage(request.userMessage);

    return {
      id: `roleplay-${randomUUID()}`,
      coachReply: blocked
        ? blockedSafetyMessage
        : `Good start. In this ${scenario.category} scenario, try making the ask one sentence shorter and include a clear next step.`,
      captions: [
        blocked ? "Safety-sensitive role-play is blocked before display." : "Coach feedback is shown as text captions.",
        blocked ? "Voice mode remains disabled for this turn." : "Voice role-play is currently disabled by feature flag."
      ],
      score,
      safetyFlags,
      nextPrompt: "Try again with one sentence that starts with 'I need...'",
      voiceEnabled: false,
      createdAt: new Date().toISOString()
    };
  }
}

const toneOpeners = {
  "warm-direct": "I want to be clear and respectful:",
  "firm-boundary": "I need to be direct about this:",
  repair: "I want to reset this in a better way:",
  curious: "I want to understand this better while being clear:"
} as const;

function buildAssertiveText(request: CoachRewriteRequest): string {
  const goal = request.goal.trim() || "move this forward";
  const context = request.context?.trim();
  const opener = toneOpeners[request.tone];

  return [
    opener,
    `When ${context ? context.toLowerCase() : "this comes up"}, I feel it would help to be explicit about what I need.`,
    `My request is: ${goal}.`,
    "I am open to talking through options, and I want us to choose a next step that works for both of us."
  ].join(" ");
}

export function scoreMessage(text: string): FeedbackScore {
  const lower = text.toLowerCase();
  const hasAsk = /(need|request|ask|can we|could we|by \w+)/.test(lower);
  const hasWarmth = /(respect|appreciate|open to|thank|understand)/.test(lower);
  const hasBoundary = /(i can|i cannot|i need|after that|by |until )/.test(lower);
  const hasEmpathy = /(works for both|understand|open to|talking through)/.test(lower);
  const regulated = !/(always|never|ridiculous|furious|hate)/.test(lower);

  return {
    clarity: hasAsk ? 86 : 64,
    politeness: hasWarmth ? 88 : 70,
    assertiveness: hasAsk || hasBoundary ? 84 : 62,
    empathy: hasEmpathy ? 82 : 66,
    boundarySpecificity: hasBoundary ? 80 : 58,
    emotionalRegulation: regulated ? 90 : 56
  };
}

export function detectSafetyFlags(text: string): string[] {
  const lower = text.toLowerCase();
  const flags: string[] = [];

  if (/(hurt myself|kill myself|suicide|self harm)/.test(lower)) {
    flags.push("self-harm");
  }

  if (/(threaten|blackmail|make them pay|ruin their life)/.test(lower)) {
    flags.push("coercion-or-threat");
  }

  if (/(hit me|afraid of them|unsafe at home|stalking|followed me|tracking me)/.test(lower)) {
    flags.push("personal-safety");
  }

  if (/(idiot|worthless|shut up|go away forever)/.test(lower)) {
    flags.push("harassment");
  }

  return flags;
}

const blockedSafetyFlags = new Set(["self-harm", "personal-safety", "coercion-or-threat"]);

const blockedSafetyMessage =
  "This looks safety-sensitive, so I cannot provide a polished message to send. Focus on immediate safety, reach out to a trusted person or local support, and use a lower-risk next step.";

function shouldBlockDisplay(flags: string[]): boolean {
  return flags.some((flag) => blockedSafetyFlags.has(flag));
}
