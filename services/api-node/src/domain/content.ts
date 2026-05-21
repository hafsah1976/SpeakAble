import type {
  BaselineAssessmentQuestion,
  Lesson,
  PracticeScenario,
  ProgressSummary,
  Recommendation
} from "@speakable/types";

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

export const defaultRecommendations: Recommendation[] = [
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

export const emptyProgress: ProgressSummary = {
  streakDays: 0,
  rewritesThisWeek: 0,
  savedPhrases: 0,
  strongestSkill: "Clear asks",
  nextSkill: "Shorter boundaries",
  recommendations: defaultRecommendations
};
