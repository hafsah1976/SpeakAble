import type {
  BaselineAssessmentQuestion,
  BaselineAssessmentRequest,
  BaselineAssessmentResponse,
  CoachRewriteRequest,
  CoachRewriteResponse,
  FeedbackScore,
  Lesson,
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

export const featureFlags = {
  voiceRolePlay: false,
  externalSharing: false
} as const;

export const practiceScenarios: PracticeScenario[] = [
  {
    id: "scenario-deadline",
    slug: "deadline-reset",
    title: "Deadline keeps moving",
    description: "Ask for a stable plan when a timeline has changed several times.",
    difficulty: "starter",
    category: "work",
    prompt: "A project deadline has moved three times and you need a final date."
  },
  {
    id: "scenario-social-battery",
    slug: "social-battery",
    title: "Declining an invitation",
    description: "Say no without overexplaining or sounding dismissive.",
    difficulty: "starter",
    category: "personal",
    prompt: "A friend invited you out, but you need a quiet night."
  },
  {
    id: "scenario-interruption",
    slug: "meeting-interruption",
    title: "Interrupted in a meeting",
    description: "Return to your point calmly and keep the room collaborative.",
    difficulty: "steady",
    category: "work",
    prompt: "Someone keeps talking over you while you are presenting an idea."
  },
  {
    id: "scenario-boundary",
    slug: "family-boundary",
    title: "Family boundary",
    description: "State a personal boundary with care and firmness.",
    difficulty: "stretch",
    category: "personal",
    prompt: "A family member is asking for details you do not want to discuss."
  }
];

export const baselineQuestions: BaselineAssessmentQuestion[] = [
  {
    id: "ask-directly",
    prompt: "When I need something, I can ask directly.",
    lowLabel: "Rarely",
    highLabel: "Usually"
  },
  {
    id: "stay-kind",
    prompt: "I can stay polite without hiding my point.",
    lowLabel: "Hard",
    highLabel: "Steady"
  },
  {
    id: "hold-boundary",
    prompt: "I can hold a boundary after someone pushes back.",
    lowLabel: "I cave",
    highLabel: "I stay clear"
  },
  {
    id: "regulate",
    prompt: "I can pause before sending a message when I feel activated.",
    lowLabel: "Rarely",
    highLabel: "Often"
  }
];

export const guidedLessons: Lesson[] = [
  {
    id: "lesson-i-statement",
    title: "Use an I statement",
    objective: "Name your experience without blaming or shrinking.",
    example: {
      before: "You keep ignoring what I need.",
      after: "I feel stuck when I do not get a reply, and I need a clear yes or no by Friday."
    },
    exercises: [
      {
        id: "exercise-i-statement",
        prompt: "Rewrite: You never listen to me in meetings.",
        exampleAnswer: "I want to finish my point before we move on."
      }
    ],
    estimatedMinutes: 4
  },
  {
    id: "lesson-boundary",
    title: "Make the boundary specific",
    objective: "Explain what you can do, what you cannot do, and the next step.",
    example: {
      before: "I cannot keep doing this.",
      after: "I can help today until 4 PM. After that I need to hand this back to you."
    },
    exercises: [
      {
        id: "exercise-boundary",
        prompt: "Rewrite: Stop asking me at the last minute.",
        exampleAnswer: "I need at least one day of notice for new requests."
      }
    ],
    estimatedMinutes: 5
  },
  {
    id: "lesson-repair",
    title: "Repair without over-apologizing",
    objective: "Own impact, make a clear request, and avoid a shame spiral.",
    example: {
      before: "I am so sorry, I am terrible at this.",
      after: "I am sorry I missed that detail. I will update it today and send the corrected version by 3 PM."
    },
    exercises: [
      {
        id: "exercise-repair",
        prompt: "Rewrite: Sorry, sorry, I know I messed everything up.",
        exampleAnswer: "I am sorry I missed the deadline. I can send the revised draft tomorrow morning."
      }
    ],
    estimatedMinutes: 6
  }
];

export const demoRecommendations: Recommendation[] = [
  {
    id: "rec-boundary",
    title: "Practice shorter boundaries",
    reason: "Your drafts are warm, but the ask can get buried.",
    action: "Try the boundary lesson next.",
    priority: "high"
  },
  {
    id: "rec-regulation",
    title: "Add a pause before hard messages",
    reason: "A short pause improves emotional regulation and tone.",
    action: "Use the role-play check-in before sending.",
    priority: "medium"
  }
];

export const demoProgress: ProgressSummary = {
  streakDays: 4,
  rewritesThisWeek: 9,
  savedPhrases: 12,
  strongestSkill: "Clear asks",
  nextSkill: "Shorter boundaries",
  recommendations: demoRecommendations
};

const toneOpeners = {
  "warm-direct": "I want to be clear and respectful:",
  "firm-boundary": "I need to be direct about this:",
  repair: "I want to reset this in a better way:",
  curious: "I want to understand this better while being clear:"
} as const;

export function buildLocalCoachingResponse(request: CoachRewriteRequest): CoachRewriteResponse {
  const trimmed = request.inputText.trim();
  const goal = request.goal.trim() || "move this forward";
  const context = request.context?.trim();
  const relationship = request.relationship.replace("-", " ");
  const opener = toneOpeners[request.tone];

  const assertiveText = [
    opener,
    `When ${context ? context.toLowerCase() : "this comes up"}, I feel it would help to be explicit about what I need.`,
    `My request is: ${goal}.`,
    `I am open to talking through options, and I want us to choose a next step that works for both of us.`
  ].join(" ");

  const safetyFlags = detectSafetyFlags(trimmed);
  const blocked = shouldBlockDisplay(safetyFlags);
  const displayedText = blocked ? blockedSafetyMessage : assertiveText;
  const outputSafetyFlags = detectSafetyFlags(displayedText);
  const feedbackScore = scoreMessage(displayedText);

  return {
    id: `local-${Date.now()}`,
    assertiveText: displayedText,
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
    safetyFlags,
    outputSafetyFlags,
    feedbackScore,
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

export function completeLocalOnboarding(request: OnboardingRequest): OnboardingResponse {
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

export function buildAssessmentResult(request: BaselineAssessmentRequest): BaselineAssessmentResponse {
  const average =
    request.answers.reduce((sum, answer) => sum + answer.value, 0) /
    Math.max(request.answers.length, 1);
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

export function buildRolePlayResponse(request: RolePlayRequest): RolePlayResponse {
  const scenario = practiceScenarios.find((item) => item.id === request.scenarioId) ?? practiceScenarios[0];
  const safetyFlags = detectSafetyFlags(request.userMessage);
  const blocked = shouldBlockDisplay(safetyFlags);
  const score = scoreMessage(request.userMessage);

  return {
    id: `roleplay-${Date.now()}`,
    coachReply:
      blocked
        ? blockedSafetyMessage
        : `Good start. In this ${scenario.category} scenario, try making the ask one sentence shorter and include a clear next step.`,
    captions: [
      blocked ? "Safety-sensitive role-play is blocked before display." : "Coach feedback is shown as text captions.",
      blocked ? "Voice mode remains disabled for this turn." : "Voice role-play is currently disabled by feature flag."
    ],
    score,
    safetyFlags,
    nextPrompt: "Try again with one sentence that starts with 'I need...'",
    voiceEnabled: featureFlags.voiceRolePlay && request.mode === "voice",
    createdAt: new Date().toISOString()
  };
}

export function buildPrivacyExport(): PrivacyExportResponse {
  return {
    id: `export-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    format: "json",
    includes: ["profile", "privacyControls", "assessmentSummary", "coachSessions", "reports"]
  };
}

export function queuePrivacyDeletion(_request: PrivacyDeletionRequest): PrivacyDeletionResponse {
  const createdAt = new Date();
  const estimatedCompletion = new Date(createdAt.getTime() + 1000 * 60 * 60 * 24 * 7);

  return {
    id: `delete-${Date.now()}`,
    status: "queued",
    createdAt: createdAt.toISOString(),
    estimatedCompletion: estimatedCompletion.toISOString()
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
