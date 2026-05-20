import { useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import {
  baselineQuestions,
  buildAssessmentResult,
  buildLocalCoachingResponse,
  buildPrivacyExport,
  buildRolePlayResponse,
  createAssertiveCoachClient,
  demoProgress,
  featureFlags,
  guidedLessons,
  practiceScenarios,
  queuePrivacyDeletion,
  type AgeRange,
  type BaselineAssessmentResponse,
  type CoachRewriteResponse,
  type CoachTone,
  type CommunicationGoal,
  type FeedbackScore,
  type PrivacyDeletionResponse,
  type PrivacyExportResponse,
  type Relationship
} from "@speakable/types";
import { colors, radii, spacing, typeScale as sharedTypeScale } from "@speakable/ui";
import { getSupabaseMobileClient } from "../lib/supabase";

const tones: Array<{ value: CoachTone; label: string; helper: string }> = [
  { value: "warm-direct", label: "Warm direct", helper: "Clear and collaborative" },
  { value: "firm-boundary", label: "Firm boundary", helper: "Short and steady" },
  { value: "repair", label: "Repair", helper: "Own impact and reset" },
  { value: "curious", label: "Curious", helper: "Ask while naming the need" }
];

const relationships: Array<{ value: Relationship; label: string }> = [
  { value: "coworker", label: "Coworker" },
  { value: "manager", label: "Manager" },
  { value: "friend", label: "Friend" },
  { value: "partner", label: "Partner" },
  { value: "family", label: "Family" },
  { value: "service-provider", label: "Service provider" },
  { value: "other", label: "Other" }
];

const goalChoices: Array<{ value: CommunicationGoal; label: string }> = [
  { value: "clearer-asks", label: "Clearer asks" },
  { value: "boundaries", label: "Boundaries" },
  { value: "hard-feedback", label: "Hard feedback" },
  { value: "less-apologizing", label: "Less apologizing" },
  { value: "conflict-repair", label: "Conflict repair" },
  { value: "workplace-confidence", label: "Workplace confidence" }
];

const ageRanges: AgeRange[] = ["under-13", "13-15", "16-17", "18-plus"];
const allowLocalDemoFallback = process.env.EXPO_PUBLIC_ALLOW_LOCAL_DEMO_FALLBACK === "true";

export function CoachScreen() {
  const [inputText, setInputText] = useState(
    "I guess it is okay if you keep changing the deadline, but it is making my week hard."
  );
  const [context, setContext] = useState("The project deadline has moved three times.");
  const [goal, setGoal] = useState("agree on a final deadline");
  const [relationship, setRelationship] = useState<Relationship>("coworker");
  const [tone, setTone] = useState<CoachTone>("warm-direct");
  const [ageRange, setAgeRange] = useState<AgeRange>("18-plus");
  const [consentAccepted, setConsentAccepted] = useState(true);
  const [selectedGoals, setSelectedGoals] = useState<CommunicationGoal[]>([
    "boundaries",
    "workplace-confidence"
  ]);
  const [saveHistory, setSaveHistory] = useState(true);
  const [personalized, setPersonalized] = useState(true);
  const [analytics, setAnalytics] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [typeScale, setTypeScale] = useState<"standard" | "large" | "extra-large">("standard");
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, number>>({
    "ask-directly": 3,
    "stay-kind": 4,
    "hold-boundary": 2,
    regulate: 3
  });
  const [assessmentResult, setAssessmentResult] = useState<BaselineAssessmentResponse>(() =>
    buildAssessmentResult({
      answers: baselineQuestions.map((question) => ({
        questionId: question.id,
        value: assessmentAnswers[question.id] ?? 3
      }))
    })
  );
  const [rolePlayMessage, setRolePlayMessage] = useState(
    "I need one final deadline so I can plan my work."
  );
  const [rolePlayResult, setRolePlayResult] = useState(() =>
    buildRolePlayResponse({
      scenarioId: "scenario-deadline",
      userMessage: rolePlayMessage,
      mode: "text"
    })
  );
  const [privacyExport, setPrivacyExport] = useState<PrivacyExportResponse>(() => buildPrivacyExport());
  const [deletionRequest, setDeletionRequest] = useState<PrivacyDeletionResponse>(() =>
    queuePrivacyDeletion({
      deletePracticeHistory: true,
      deleteAssessment: false,
      deleteAccount: false
    })
  );
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(
    allowLocalDemoFallback ? "Development demo draft" : "Private draft"
  );
  const [result, setResult] = useState<CoachRewriteResponse>(() =>
    buildLocalCoachingResponse({
      inputText,
      context,
      goal,
      relationship,
      tone
    })
  );

  const headingStyle =
    typeScale === "extra-large"
      ? styles.screenTitleExtraLarge
      : typeScale === "large"
        ? styles.screenTitleLarge
        : null;
  const bodyStyle = typeScale === "standard" ? null : styles.readableTextLarge;

  const apiClient = useMemo(() => {
    const supabase = getSupabaseMobileClient();

    return createAssertiveCoachClient({
      baseUrl: process.env.EXPO_PUBLIC_API_URL,
      allowLocalDemoFallback,
      getAccessToken: async () => {
        const session = await supabase?.auth.getSession();
        return session?.data.session?.access_token;
      }
    });
  }, []);

  function toggleGoal(value: CommunicationGoal) {
    setSelectedGoals((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  function applyScenario(prompt: string) {
    setContext(prompt);
    setInputText("I do not want this to become tense, but I need to say something.");
    setGoal("state what I need without blaming the other person");
    setStatus("Scenario loaded");
  }

  async function rewrite() {
    if (!inputText.trim()) {
      setStatus("Add the message you want to practice first.");
      return;
    }

    const payload = { inputText, context, goal, relationship, tone };
    setIsLoading(true);
    setStatus("Coaching your draft");

    await apiClient.trackEvent({
      name: "coach_rewrite_requested",
      source: "mobile",
      properties: { surface: "coach", safetyFlagCount: result.safetyFlags.length }
    });

    try {
      setResult(await apiClient.rewriteMessage(payload));
      setStatus("Rewrite ready");
    } catch {
      setStatus("API unavailable. No production fallback was used.");
    } finally {
      setIsLoading(false);
    }
  }

  async function report() {
    await apiClient.trackEvent({
      name: "moderation_report_submitted",
      source: "mobile",
      properties: { surface: "coach", safetyFlagCount: result.safetyFlags.length }
    });
    await apiClient.createReport({
      subjectType: "coach_message",
      subjectId: result.id,
      reason: "Needs review"
    });
    Alert.alert("Report queued", "A moderation reviewer can inspect this result.");
  }

  async function completeOnboarding() {
    await apiClient.trackEvent({
      name: "onboarding_saved",
      source: "mobile",
      properties: { surface: "readiness", goalCount: selectedGoals.length }
    });
    const response = await apiClient.completeOnboarding({
      ageRange,
      consentAccepted,
      goals: selectedGoals,
      privacyControls: {
        savePracticeHistory: saveHistory,
        allowPersonalizedRecommendations: personalized,
        allowDeidentifiedProductAnalytics: analytics
      },
      accessibility: {
        captions,
        reducedMotion,
        adjustableType: typeScale
      }
    });
    setStatus(response.completed ? "Onboarding saved" : "Age gate or consent needs review");
  }

  async function submitAssessment() {
    await apiClient.trackEvent({
      name: "baseline_assessment_submitted",
      source: "mobile",
      properties: { surface: "assessment" }
    });
    const response = await apiClient.submitAssessment({
      answers: baselineQuestions.map((question) => ({
        questionId: question.id,
        value: assessmentAnswers[question.id] ?? 3
      }))
    });
    setAssessmentResult(response);
    setStatus("Assessment updated");
  }

  async function runRolePlay() {
    await apiClient.trackEvent({
      name: "role_play_turn_submitted",
      source: "mobile",
      properties: {
        surface: "roleplay",
        mode: featureFlags.voiceRolePlay ? "voice" : "text",
        featureFlag: "voiceRolePlay"
      }
    });
    const response = await apiClient.rolePlay({
      scenarioId: "scenario-deadline",
      userMessage: rolePlayMessage,
      mode: featureFlags.voiceRolePlay ? "voice" : "text"
    });
    setRolePlayResult(response);
    setStatus("Role-play feedback ready");
  }

  async function exportData() {
    await apiClient.trackEvent({
      name: "privacy_export_requested",
      source: "mobile",
      properties: { surface: "privacy" }
    });
    const response = await apiClient.exportPrivacyData();
    setPrivacyExport(response);
    setStatus("Privacy export prepared");
  }

  async function deleteData() {
    await apiClient.trackEvent({
      name: "privacy_deletion_requested",
      source: "mobile",
      properties: { surface: "privacy" }
    });
    const response = await apiClient.requestDeletion({
      deletePracticeHistory: true,
      deleteAssessment: true,
      deleteAccount: false
    });
    setDeletionRequest(response);
    setStatus("Deletion request queued");
  }

  const hasSafetySignal = result.safetyFlags.length > 0 || result.outputSafetyFlags.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>AC</Text>
          </View>
          <View style={styles.brandText}>
            <Text style={styles.brandName}>SpeakAble</Text>
            <Text style={styles.brandCaption}>Clear, kind, firm</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={[styles.screenTitle, headingStyle]}>Practice saying it clearly.</Text>
          <Text style={[styles.screenSubtitle, bodyStyle]}>
            Turn avoidance into one respectful request, boundary, or repair attempt.
          </Text>
          <View style={styles.statusPill} accessibilityLiveRegion="polite">
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>

        <View style={styles.focusStrip}>
          <SectionHeader title="Scroll break" tone="blue" />
          <Text style={[styles.focusText, bodyStyle]}>
            When you catch yourself avoiding a message, draft one honest sentence here and leave the feed.
          </Text>
          <SecondaryButton label="Coach this draft" onPress={rewrite} disabled={isLoading} />
        </View>

        <Panel>
          <SectionHeader
            title="Your draft"
            description="Messy is fine. The coach will make it clear, kind, and specific."
          />
          <FieldLabel>Message</FieldLabel>
          <TextInput
            accessibilityLabel="Message to rewrite"
            multiline
            value={inputText}
            onChangeText={setInputText}
            style={[styles.input, styles.messageInput, bodyStyle]}
            textAlignVertical="top"
          />

          <FieldLabel>Relationship</FieldLabel>
          <View style={styles.choiceGrid}>
            {relationships.map((item) => (
              <ChoiceChip
                key={item.value}
                label={item.label}
                selected={relationship === item.value}
                onPress={() => setRelationship(item.value)}
              />
            ))}
          </View>

          <FieldLabel>Goal</FieldLabel>
          <TextInput
            accessibilityLabel="Conversation goal"
            multiline
            value={goal}
            onChangeText={setGoal}
            style={[styles.input, styles.compactInput, bodyStyle]}
            textAlignVertical="top"
          />

          <FieldLabel>Context</FieldLabel>
          <TextInput
            accessibilityLabel="Conversation context"
            multiline
            value={context}
            onChangeText={setContext}
            style={[styles.input, styles.compactInput, bodyStyle]}
            textAlignVertical="top"
          />

          <FieldLabel>Tone</FieldLabel>
          <View style={styles.toneGrid}>
            {tones.map((item) => (
              <Pressable
                key={item.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: tone === item.value }}
                style={[styles.toneChoice, tone === item.value && styles.choiceSelected]}
                onPress={() => setTone(item.value)}
              >
                <Text style={[styles.choiceTitle, tone === item.value && styles.choiceTextSelected]}>
                  {item.label}
                </Text>
                <Text style={styles.choiceHelper}>{item.helper}</Text>
              </Pressable>
            ))}
          </View>

          <PrimaryButton label={isLoading ? "Coaching" : "Rewrite assertively"} onPress={rewrite} disabled={isLoading} />
        </Panel>

        <Panel>
          <View style={styles.rowBetween}>
            <SectionHeader
              title="Coach response"
              description="Structured feedback is safety-gated before display."
            />
            <Pressable accessibilityRole="button" style={styles.reportButton} onPress={report}>
              <Text style={styles.reportText}>Report</Text>
            </Pressable>
          </View>
          <Text style={[styles.rewriteText, bodyStyle]}>{result.assertiveText}</Text>
          {hasSafetySignal ? (
            <View style={styles.safetyCallout}>
              <Text style={styles.safetyText}>
                Safety-sensitive content was detected. Slow down, use support, and avoid direct confrontation if
                there is immediate risk.
              </Text>
            </View>
          ) : null}
          <ScoreList score={result.feedbackScore} />
          {result.coachingNotes.map((note) => (
            <View key={note.label} style={styles.noteRow}>
              <Text style={styles.noteTitle}>{note.label}</Text>
              <Text style={[styles.noteText, bodyStyle]}>{note.detail}</Text>
            </View>
          ))}
          <View style={styles.practiceTips}>
            {result.suggestedPractice.map((practice) => (
              <Text key={practice} style={styles.practiceTip}>
                {practice}
              </Text>
            ))}
          </View>
        </Panel>

        <Panel>
          <SectionHeader title="Progress" description={`Strongest: ${demoProgress.strongestSkill}. Next: ${demoProgress.nextSkill}.`} />
          <View style={styles.metrics}>
            <Metric label="day streak" value={demoProgress.streakDays} />
            <Metric label="rewrites" value={demoProgress.rewritesThisWeek} />
            <Metric label="saved" value={demoProgress.savedPhrases} />
          </View>
        </Panel>

        <Panel>
          <SectionHeader title="Practice queue" />
          {practiceScenarios.map((scenario) => (
            <Pressable
              key={scenario.id}
              accessibilityRole="button"
              style={styles.listButton}
              onPress={() => applyScenario(scenario.prompt)}
            >
              <Text style={styles.listTitle}>{scenario.title}</Text>
              <Text style={styles.mutedText}>
                {scenario.category} - {scenario.difficulty}
              </Text>
            </Pressable>
          ))}
        </Panel>

        <Panel>
          <SectionHeader title="Role-play" description={`Text first. Voice optional: ${featureFlags.voiceRolePlay ? "enabled" : "disabled"}.`} />
          <TextInput
            accessibilityLabel="Role-play message"
            multiline
            value={rolePlayMessage}
            onChangeText={setRolePlayMessage}
            style={[styles.input, styles.compactInput, bodyStyle]}
            textAlignVertical="top"
          />
          <SecondaryButton label="Run role-play" onPress={runRolePlay} />
          <View style={styles.coachMiniResult}>
            <Text style={[styles.noteText, bodyStyle]}>{rolePlayResult.coachReply}</Text>
            {captions ? rolePlayResult.captions.map((caption) => <Text key={caption} style={styles.mutedText}>{caption}</Text>) : null}
          </View>
          <ScoreList score={rolePlayResult.score} compact />
        </Panel>

        <Panel>
          <SectionHeader title="Lessons" />
          {guidedLessons.map((lesson) => (
            <View key={lesson.id} style={styles.listItem}>
              <Text style={styles.listTitle}>{lesson.title}</Text>
              <Text style={[styles.mutedText, bodyStyle]}>{lesson.objective}</Text>
            </View>
          ))}
        </Panel>

        <Panel>
          <SectionHeader
            title="Readiness"
            description="Consent, goals, baseline style, and accessibility stay together."
          />

          <FieldLabel>Age gate</FieldLabel>
          <View style={styles.choiceGrid}>
            {ageRanges.map((item) => (
              <ChoiceChip
                key={item}
                label={item}
                selected={ageRange === item}
                onPress={() => setAgeRange(item)}
              />
            ))}
          </View>
          <SwitchRow
            label="Communication practice only. Not therapy, legal, HR, or crisis advice."
            value={consentAccepted}
            onValueChange={setConsentAccepted}
          />

          <FieldLabel>Communication goals</FieldLabel>
          <View style={styles.choiceGrid}>
            {goalChoices.map((item) => (
              <ChoiceChip
                key={item.value}
                label={item.label}
                selected={selectedGoals.includes(item.value)}
                onPress={() => toggleGoal(item.value)}
              />
            ))}
          </View>

          <SecondaryButton label="Save onboarding" onPress={completeOnboarding} />

          <View style={styles.divider} />
          <SectionHeader title="Assessment" compact />
          {baselineQuestions.map((question) => (
            <View key={question.id} style={styles.assessmentRow}>
              <Text style={styles.noteTitle}>{question.prompt}</Text>
              <View style={styles.scaleGrid}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityLabel={`${question.prompt}: ${value}`}
                    style={[styles.scaleButton, assessmentAnswers[question.id] === value && styles.choiceSelected]}
                    onPress={() =>
                      setAssessmentAnswers((current) => ({
                        ...current,
                        [question.id]: value
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.choiceTitle,
                        assessmentAnswers[question.id] === value && styles.choiceTextSelected
                      ]}
                    >
                      {value}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
          <View style={styles.assessmentResult}>
            <Text style={styles.assessmentText}>Style: {assessmentResult.style}</Text>
            <Text style={[styles.mutedText, bodyStyle]}>{assessmentResult.summary}</Text>
          </View>
          <SecondaryButton label="Update assessment" onPress={submitAssessment} />

          <View style={styles.divider} />
          <SectionHeader title="Accessibility" compact />
          <SwitchRow label="Captions" value={captions} onValueChange={setCaptions} />
          <SwitchRow label="Reduced motion" value={reducedMotion} onValueChange={setReducedMotion} />
          <View style={styles.choiceGrid}>
            {(["standard", "large", "extra-large"] as const).map((item) => (
              <ChoiceChip
                key={item}
                label={item.replace("-", " ")}
                selected={typeScale === item}
                onPress={() => setTypeScale(item)}
              />
            ))}
          </View>
        </Panel>

        <Panel tone="safety">
          <SectionHeader title="Privacy center" />
          <Text style={[styles.mutedText, bodyStyle]}>
            Export data or queue deletion of saved practice and assessment data.
          </Text>
          <SwitchRow label="Save practice history" value={saveHistory} onValueChange={setSaveHistory} />
          <SwitchRow label="Personalize recommendations" value={personalized} onValueChange={setPersonalized} />
          <SwitchRow label="Deidentified analytics" value={analytics} onValueChange={setAnalytics} />
          <SecondaryButton label="Prepare export" onPress={exportData} />
          <Pressable accessibilityRole="button" style={styles.dangerButton} onPress={deleteData}>
            <Text style={styles.reportText}>Queue deletion</Text>
          </Pressable>
          <Text style={styles.mutedText}>Export: {privacyExport.id}</Text>
          <Text style={styles.mutedText}>Deletion: {deletionRequest.status}</Text>
        </Panel>
      </ScrollView>
    </SafeAreaView>
  );
}

function Panel({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "safety" }) {
  return <View style={[styles.panel, tone === "safety" && styles.safetyPanel]}>{children}</View>;
}

function SectionHeader({
  title,
  description,
  compact = false,
  tone = "default"
}: {
  title: string;
  description?: string;
  compact?: boolean;
  tone?: "default" | "blue";
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[compact ? styles.sectionTitleCompact : styles.sectionTitle, tone === "blue" && styles.blueTitle]}>
        {title}
      </Text>
      {description ? <Text style={styles.mutedText}>{description}</Text> : null}
    </View>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

function ChoiceChip({
  label,
  selected,
  onPress
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.choice, selected && styles.choiceSelected]}
      onPress={onPress}
    >
      <Text style={[styles.choiceTitle, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled = false
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[styles.primaryButton, disabled && styles.disabledButton]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  label,
  onPress,
  disabled = false
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[styles.secondaryButton, disabled && styles.disabledButton]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function SwitchRow({
  label,
  value,
  onValueChange
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        thumbColor={value ? colors.accent : colors.background}
        trackColor={{ false: colors.border, true: colors.accentSoft }}
      />
    </View>
  );
}

function ScoreList({ score, compact = false }: { score: FeedbackScore; compact?: boolean }) {
  const rows = [
    ["Clarity", score.clarity],
    ["Politeness", score.politeness],
    ["Assertiveness", score.assertiveness],
    ["Empathy", score.empathy],
    ["Boundary", score.boundarySpecificity],
    ["Regulation", score.emotionalRegulation]
  ] as const;

  return (
    <View style={[styles.scoreList, compact && styles.scoreListCompact]} accessibilityLabel="Structured feedback scores">
      {rows.map(([label, value]) => (
        <View key={label} style={styles.scoreRow}>
          <Text style={styles.metricLabel}>{label}</Text>
          <View style={styles.scoreTrack} accessibilityElementsHidden>
            <View style={[styles.scoreFill, { width: `${value}%` }]} />
          </View>
          <Text style={styles.scoreValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing["3xl"]
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  brandMarkText: {
    color: colors.accentDark,
    fontWeight: "800"
  },
  brandText: {
    flex: 1
  },
  brandName: {
    color: colors.text,
    fontSize: sharedTypeScale.body,
    fontWeight: "800"
  },
  brandCaption: {
    color: colors.mutedText,
    fontSize: sharedTypeScale.small,
    marginTop: 2
  },
  hero: {
    gap: spacing.md
  },
  screenTitle: {
    color: colors.text,
    fontSize: sharedTypeScale.hero,
    fontWeight: "800",
    lineHeight: 38
  },
  screenTitleLarge: {
    fontSize: sharedTypeScale.heroLarge,
    lineHeight: 43
  },
  screenTitleExtraLarge: {
    fontSize: 42,
    lineHeight: 47
  },
  screenSubtitle: {
    color: colors.mutedText,
    fontSize: sharedTypeScale.body,
    lineHeight: 23
  },
  readableTextLarge: {
    fontSize: 17,
    lineHeight: 25
  },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  statusText: {
    color: colors.accentDark,
    fontSize: sharedTypeScale.small,
    fontWeight: "800"
  },
  focusStrip: {
    backgroundColor: colors.blueSoft,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  focusText: {
    color: "#35576e",
    fontSize: 14,
    lineHeight: 21
  },
  panel: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  safetyPanel: {
    borderColor: "#d9e1df"
  },
  sectionHeader: {
    gap: spacing.xs
  },
  sectionTitle: {
    color: colors.text,
    fontSize: sharedTypeScale.title,
    fontWeight: "800",
    lineHeight: 27
  },
  sectionTitleCompact: {
    color: colors.text,
    fontSize: sharedTypeScale.section,
    fontWeight: "800",
    lineHeight: 23
  },
  blueTitle: {
    color: colors.blue
  },
  label: {
    color: colors.mutedText,
    fontSize: sharedTypeScale.label,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  input: {
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: sharedTypeScale.body,
    minHeight: 46,
    padding: spacing.md
  },
  messageInput: {
    minHeight: 164
  },
  compactInput: {
    minHeight: 76
  },
  choiceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  toneGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  choice: {
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  toneChoice: {
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    minWidth: "47%",
    padding: spacing.md
  },
  choiceSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent
  },
  choiceTitle: {
    color: colors.text,
    fontSize: sharedTypeScale.small,
    fontWeight: "800",
    textTransform: "capitalize"
  },
  choiceHelper: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 17
  },
  choiceTextSelected: {
    color: colors.accentDark
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    justifyContent: "center",
    minHeight: 50
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: sharedTypeScale.body,
    fontWeight: "800"
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44
  },
  secondaryButtonText: {
    color: colors.accentDark,
    fontSize: 14,
    fontWeight: "800"
  },
  disabledButton: {
    opacity: 0.72
  },
  rowBetween: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  reportButton: {
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  dangerButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44
  },
  reportText: {
    color: colors.coral,
    fontSize: sharedTypeScale.small,
    fontWeight: "800"
  },
  rewriteText: {
    backgroundColor: colors.surface,
    borderLeftColor: colors.accent,
    borderLeftWidth: 4,
    color: colors.text,
    fontSize: 21,
    fontWeight: "800",
    lineHeight: 30,
    padding: spacing.lg
  },
  safetyCallout: {
    backgroundColor: colors.coralSoft,
    borderColor: colors.coral,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md
  },
  safetyText: {
    color: "#723322",
    fontSize: sharedTypeScale.small,
    lineHeight: 19
  },
  noteRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.md
  },
  noteTitle: {
    color: colors.text,
    fontSize: sharedTypeScale.body,
    fontWeight: "800"
  },
  noteText: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 21
  },
  practiceTips: {
    gap: spacing.sm
  },
  practiceTip: {
    backgroundColor: colors.goldSoft,
    borderRadius: radii.md,
    color: "#6f4e16",
    fontSize: sharedTypeScale.small,
    fontWeight: "800",
    lineHeight: 19,
    padding: spacing.md
  },
  metrics: {
    flexDirection: "row",
    gap: spacing.sm
  },
  metric: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    flex: 1,
    padding: spacing.md
  },
  metricValue: {
    color: colors.accentDark,
    fontSize: 24,
    fontWeight: "800"
  },
  metricLabel: {
    color: colors.mutedText,
    fontSize: sharedTypeScale.label
  },
  mutedText: {
    color: colors.mutedText,
    fontSize: sharedTypeScale.small,
    lineHeight: 19
  },
  listButton: {
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  listItem: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.md
  },
  listTitle: {
    color: colors.text,
    fontSize: sharedTypeScale.body,
    fontWeight: "800"
  },
  coachMiniResult: {
    backgroundColor: colors.surface,
    borderLeftColor: colors.accent,
    borderLeftWidth: 3,
    gap: spacing.sm,
    padding: spacing.md
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: spacing.xs
  },
  assessmentRow: {
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  scaleGrid: {
    flexDirection: "row",
    gap: spacing.sm
  },
  scaleButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 40
  },
  assessmentResult: {
    backgroundColor: colors.surface,
    borderLeftColor: colors.blue,
    borderLeftWidth: 3,
    gap: spacing.xs,
    padding: spacing.md
  },
  assessmentText: {
    color: colors.blue,
    fontSize: sharedTypeScale.small,
    fontWeight: "800",
    textTransform: "capitalize"
  },
  switchRow: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md
  },
  switchLabel: {
    color: colors.text,
    flex: 1,
    fontSize: sharedTypeScale.small,
    fontWeight: "700",
    lineHeight: 19
  },
  scoreList: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    gap: spacing.sm,
    padding: spacing.md
  },
  scoreListCompact: {
    padding: spacing.sm
  },
  scoreRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  scoreTrack: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 999,
    flex: 1,
    height: 8,
    overflow: "hidden"
  },
  scoreFill: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 8
  },
  scoreValue: {
    color: colors.accentDark,
    fontSize: sharedTypeScale.small,
    fontWeight: "800",
    minWidth: 28,
    textAlign: "right"
  }
});
