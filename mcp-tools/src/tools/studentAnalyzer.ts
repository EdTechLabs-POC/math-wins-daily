export const STUDENT_ANALYZER_TOOL = {
  name: "analyze_student_gaps",
  description: "Analyzes student diagnostic data to identify knowledge gaps, recommend difficulty levels, and determine focus areas for Year 3 maths.",
  inputSchema: {
    type: "object",
    properties: {
      diagnostic_scores: {
        type: "object",
        description: "Dictionary of topic names to scores (0-100)",
        additionalProperties: { type: "number" },
      },
      recent_sessions: {
        type: "array",
        description: "List of recent practice sessions",
        items: {
          type: "object",
          properties: {
            topic: { type: "string" },
            score: { type: "number" },
            date: { type: "string" },
          },
        },
      },
    },
    required: ["diagnostic_scores", "recent_sessions"],
  },
};

interface SessionData {
  topic: string;
  score: number;
  date: string;
}

interface AnalysisResult {
  weak_topics: string[];
  recommended_difficulty: string;
  focus_areas: Array<{
    topic: string;
    priority: string;
    reason: string;
  }>;
  overall_readiness: number;
}

const TOPIC_PREREQUISITES: Record<string, string[]> = {
  multiplication: ["addition", "counting"],
  division: ["multiplication", "subtraction"],
  fractions: ["division", "multiplication"],
  word_problems: ["addition", "subtraction", "multiplication"],
  place_value: ["counting"],
};

const SCORE_THRESHOLDS = {
  weak: 60,
  moderate: 75,
  strong: 90,
};

export function analyzeStudentGaps(
  diagnosticScores: Record<string, number>,
  recentSessions: SessionData[]
): AnalysisResult {
  // Identify weak topics (score < 60%)
  const weakTopics: string[] = [];
  for (const [topic, score] of Object.entries(diagnosticScores)) {
    if (score < SCORE_THRESHOLDS.weak) {
      weakTopics.push(topic);
    }
  }

  // Calculate trend for each topic from recent sessions
  const topicTrends: Record<string, number[]> = {};
  for (const session of recentSessions) {
    if (!topicTrends[session.topic]) {
      topicTrends[session.topic] = [];
    }
    topicTrends[session.topic].push(session.score);
  }

  // Determine focus areas with priority
  const focusAreas: Array<{ topic: string; priority: string; reason: string }> = [];

  for (const topic of weakTopics) {
    const prereqs = TOPIC_PREREQUISITES[topic] || [];
    const prereqsWeak = prereqs.filter(
      (p) => diagnosticScores[p] !== undefined && diagnosticScores[p] < SCORE_THRESHOLDS.weak
    );

    let priority: string;
    let reason: string;

    if (prereqsWeak.length > 0) {
      priority = "critical";
      reason = `Prerequisite topics (${prereqsWeak.join(", ")}) also need work`;
    } else {
      const trend = topicTrends[topic];
      if (trend && trend.length >= 2) {
        const improving = trend[trend.length - 1] > trend[0];
        priority = improving ? "medium" : "high";
        reason = improving ? "Showing improvement but still needs practice" : "Not showing improvement, needs focused attention";
      } else {
        priority = "high";
        reason = "Below threshold with insufficient practice data";
      }
    }

    focusAreas.push({ topic, priority, reason });
  }

  // Sort by priority
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  focusAreas.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Calculate overall readiness (average of all scores)
  const scores = Object.values(diagnosticScores);
  const overallReadiness = scores.length > 0 
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
    : 0;

  // Determine recommended difficulty
  let recommendedDifficulty: string;
  if (overallReadiness < 50) {
    recommendedDifficulty = "foundation";
  } else if (overallReadiness < 75) {
    recommendedDifficulty = "core";
  } else {
    recommendedDifficulty = "challenge";
  }

  return {
    weak_topics: weakTopics,
    recommended_difficulty: recommendedDifficulty,
    focus_areas: focusAreas,
    overall_readiness: overallReadiness,
  };
}
