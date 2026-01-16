export const BENCHMARK_CHECKER_TOOL = {
  name: "compare_to_benchmark",
  description: "Compares a generated maths question against quality benchmarks for Year 3 students. Checks for real-world context, clear language, age-appropriateness, and use of concrete objects.",
  inputSchema: {
    type: "object",
    properties: {
      generated_question: {
        type: "string",
        description: "The generated question to evaluate",
      },
      topic: {
        type: "string",
        description: "The mathematical topic of the question",
      },
    },
    required: ["generated_question", "topic"],
  },
};

interface BenchmarkResult {
  quality_score: number;
  passes_benchmark: boolean;
  criteria_scores: {
    real_world_context: number;
    clear_language: number;
    age_appropriate: number;
    concrete_objects: number;
  };
  improvements_needed: string[];
  strengths: string[];
}

// Concrete objects commonly used in Year 3 maths
const CONCRETE_OBJECTS = [
  "apple", "apples", "orange", "oranges", "banana", "bananas", "fruit",
  "sweet", "sweets", "cake", "cakes", "cookie", "cookies", "biscuit", "biscuits",
  "pencil", "pencils", "pen", "pens", "book", "books", "ruler", "rulers",
  "toy", "toys", "ball", "balls", "car", "cars", "doll", "dolls",
  "coin", "coins", "penny", "pennies", "pound", "pounds", "pence", "money",
  "sticker", "stickers", "card", "cards", "marble", "marbles",
  "child", "children", "pupil", "pupils", "student", "students", "friend", "friends",
  "team", "teams", "group", "groups", "class",
  "egg", "eggs", "flower", "flowers", "tree", "trees", "leaf", "leaves",
  "bird", "birds", "fish", "cat", "cats", "dog", "dogs", "animal", "animals",
  "box", "boxes", "bag", "bags", "packet", "packets", "jar", "jars",
  "pizza", "pizzas", "slice", "slices", "piece", "pieces",
  "page", "pages", "step", "steps", "point", "points",
];

// Real-world contexts
const REAL_WORLD_CONTEXTS = [
  "shop", "store", "supermarket", "market",
  "school", "classroom", "playground", "library",
  "home", "kitchen", "garden", "bedroom",
  "party", "birthday", "picnic", "trip",
  "game", "sport", "match", "race",
  "farm", "zoo", "park", "beach",
  "bus", "train", "car", "bicycle",
  "morning", "afternoon", "day", "week", "month",
  "buy", "sell", "share", "give", "collect",
  "bake", "cook", "make", "build",
];

// Complex vocabulary to avoid for Year 3
const COMPLEX_VOCABULARY = [
  "calculate", "determine", "compute", "evaluate", "assess",
  "approximately", "estimation", "therefore", "hence", "thus",
  "respectively", "subsequently", "consequently", "furthermore",
  "parameter", "variable", "coefficient", "quotient", "remainder",
  "denominator", "numerator", // These should be introduced carefully
  "perpendicular", "parallel", "symmetrical",
];

// Simple question starters for Year 3
const CLEAR_STARTERS = [
  "how many", "how much", "what is", "what are",
  "count", "add", "subtract", "multiply", "divide",
  "share", "split", "find", "work out",
];

function countMatches(text: string, patterns: string[]): number {
  const lowerText = text.toLowerCase();
  return patterns.filter((p) => lowerText.includes(p.toLowerCase())).length;
}

function hasName(text: string): boolean {
  // Check for common children's names or character names
  const namePatterns = /\b(Tom|Emma|Lily|Jack|Sophie|Oliver|Amelia|Harry|Mia|Noah|Ava|Leo|Ella|Max|Ruby|Sam|Amy|Ben|Lucy|Zara|Ali|Priya|Raj|Maya|Finn|Isla|Oscar|Grace|James|Emily|Charlotte|Ethan|Isabella|William|Sophia|Daniel|Chloe|Henry|Evie|Jacob|Poppy|Alfie|Freya)\b/i;
  return namePatterns.test(text);
}

export function compareToBenchmark(generatedQuestion: string, topic: string): BenchmarkResult {
  const improvements: string[] = [];
  const strengths: string[] = [];
  const lowerQuestion = generatedQuestion.toLowerCase();

  // 1. Real-world context score (0-10)
  const contextMatches = countMatches(generatedQuestion, REAL_WORLD_CONTEXTS);
  const hasNameInQuestion = hasName(generatedQuestion);
  let realWorldScore = Math.min(contextMatches * 3, 7);
  if (hasNameInQuestion) realWorldScore += 3;
  realWorldScore = Math.min(realWorldScore, 10);

  if (realWorldScore >= 7) {
    strengths.push("Good use of real-world context");
  } else if (realWorldScore < 5) {
    improvements.push("Add a relatable real-world scenario (e.g., shopping, school, playing)");
  }

  // 2. Clear language score (0-10)
  const complexWords = countMatches(generatedQuestion, COMPLEX_VOCABULARY);
  const clearStarters = countMatches(generatedQuestion, CLEAR_STARTERS);
  const hasQuestion = generatedQuestion.includes("?");
  const sentenceLength = generatedQuestion.split(/[.!?]/).filter(Boolean).length;
  const avgWordCount = generatedQuestion.split(/\s+/).length / Math.max(sentenceLength, 1);

  let clearLanguageScore = 10;
  clearLanguageScore -= complexWords * 2;
  if (!hasQuestion) clearLanguageScore -= 2;
  if (avgWordCount > 20) clearLanguageScore -= 2;
  if (clearStarters === 0) clearLanguageScore -= 1;
  clearLanguageScore = Math.max(0, Math.min(10, clearLanguageScore));

  if (clearLanguageScore >= 8) {
    strengths.push("Clear, age-appropriate language");
  } else {
    if (complexWords > 0) {
      improvements.push("Simplify vocabulary - avoid complex mathematical terms");
    }
    if (!hasQuestion) {
      improvements.push("Include a clear question mark");
    }
    if (avgWordCount > 20) {
      improvements.push("Break into shorter sentences for easier reading");
    }
  }

  // 3. Age-appropriate score (0-10)
  const questionLength = generatedQuestion.length;
  const numbers = generatedQuestion.match(/\d+/g) || [];
  const maxNumber = numbers.length > 0 ? Math.max(...numbers.map(Number)) : 0;

  let ageAppropriateScore = 10;
  if (questionLength > 200) ageAppropriateScore -= 3;
  if (questionLength > 300) ageAppropriateScore -= 2;
  if (maxNumber > 1000) ageAppropriateScore -= 3;
  if (numbers.length > 4) ageAppropriateScore -= 2;
  ageAppropriateScore = Math.max(0, Math.min(10, ageAppropriateScore));

  if (ageAppropriateScore >= 8) {
    strengths.push("Appropriate complexity for Year 3");
  } else {
    if (questionLength > 200) {
      improvements.push("Shorten the question - aim for under 150 characters");
    }
    if (maxNumber > 1000) {
      improvements.push("Use smaller numbers (Year 3 works with numbers up to 1000)");
    }
  }

  // 4. Concrete objects score (0-10)
  const objectMatches = countMatches(generatedQuestion, CONCRETE_OBJECTS);
  let concreteObjectsScore = Math.min(objectMatches * 4, 10);

  if (concreteObjectsScore >= 6) {
    strengths.push("Good use of concrete, tangible objects");
  } else {
    improvements.push("Use concrete objects children can visualize (apples, toys, stickers, etc.)");
  }

  // Calculate overall score
  const weights = {
    real_world_context: 0.25,
    clear_language: 0.30,
    age_appropriate: 0.25,
    concrete_objects: 0.20,
  };

  const qualityScore = Math.round(
    realWorldScore * weights.real_world_context +
    clearLanguageScore * weights.clear_language +
    ageAppropriateScore * weights.age_appropriate +
    concreteObjectsScore * weights.concrete_objects
  );

  return {
    quality_score: qualityScore,
    passes_benchmark: qualityScore >= 7,
    criteria_scores: {
      real_world_context: realWorldScore,
      clear_language: clearLanguageScore,
      age_appropriate: ageAppropriateScore,
      concrete_objects: concreteObjectsScore,
    },
    improvements_needed: improvements,
    strengths,
  };
}
