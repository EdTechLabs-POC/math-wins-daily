export const CURRICULUM_VALIDATOR_TOOL = {
  name: "validate_question",
  description: "Validates a maths question against UK National Curriculum Year 3 standards. Checks multiplication tables (2-10), division (max 100), place value (to 1000), and word problem requirements.",
  inputSchema: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "The question text to validate",
      },
      topic: {
        type: "string",
        description: "The mathematical topic (e.g., multiplication, division, addition, place_value, word_problems)",
      },
    },
    required: ["question", "topic"],
  },
};

interface ValidationResult {
  is_valid: boolean;
  issues: string[];
  suggestions: string[];
  curriculum_alignment: {
    topic_appropriate: boolean;
    difficulty_level: string;
    year_group_match: boolean;
  };
}

// UK Year 3 curriculum standards
const YEAR_3_STANDARDS = {
  multiplication: {
    tables: [2, 3, 4, 5, 8, 10], // Year 3 focuses on these tables
    max_product: 100,
  },
  division: {
    max_dividend: 100,
    tables: [2, 3, 4, 5, 8, 10],
  },
  addition: {
    max_sum: 1000,
    mental_max: 100,
  },
  subtraction: {
    max_value: 1000,
    mental_max: 100,
  },
  place_value: {
    max_number: 1000,
    concepts: ["hundreds", "tens", "ones", "compare", "order"],
  },
  fractions: {
    denominators: [2, 3, 4, 8], // Unit fractions focus
    types: ["unit fractions", "equivalent", "comparing"],
  },
  word_problems: {
    max_steps: 2,
    operations: ["addition", "subtraction", "multiplication", "division"],
  },
};

function extractNumbers(text: string): number[] {
  const matches = text.match(/\d+/g);
  return matches ? matches.map(Number) : [];
}

function detectOperations(text: string): string[] {
  const operations: string[] = [];
  const lowerText = text.toLowerCase();

  if (/(\+|add|plus|sum|total|altogether|more than|increase)/.test(lowerText)) {
    operations.push("addition");
  }
  if (/(-|subtract|minus|take away|difference|less than|decrease|left|remain)/.test(lowerText)) {
    operations.push("subtraction");
  }
  if (/(×|x|multiply|times|groups of|lots of|each|per)/.test(lowerText)) {
    operations.push("multiplication");
  }
  if (/(÷|\/|divide|share|split|equally|each get)/.test(lowerText)) {
    operations.push("division");
  }

  return operations;
}

export function validateQuestion(question: string, topic: string): ValidationResult {
  const issues: string[] = [];
  const suggestions: string[] = [];
  const numbers = extractNumbers(question);
  const operations = detectOperations(question);

  let topicAppropriate = true;
  let difficultyLevel = "core";
  let yearGroupMatch = true;

  const standards = YEAR_3_STANDARDS[topic as keyof typeof YEAR_3_STANDARDS];

  if (!standards) {
    issues.push(`Unknown topic: ${topic}`);
    topicAppropriate = false;
  }

  switch (topic) {
    case "multiplication": {
      const multStandards = YEAR_3_STANDARDS.multiplication;
      
      // Check if numbers are within Year 3 times tables
      for (const num of numbers) {
        if (num > 10 && !multStandards.tables.includes(num)) {
          // Check if it's a valid product
          const isValidProduct = multStandards.tables.some(
            (t) => num % t === 0 && num / t <= 10
          );
          if (!isValidProduct && num > multStandards.max_product) {
            issues.push(`Number ${num} exceeds Year 3 multiplication range`);
            yearGroupMatch = false;
          }
        }
      }

      // Check for two-factor multiplication
      if (numbers.length >= 2) {
        const [a, b] = numbers;
        if (a > 12 || b > 12) {
          suggestions.push("Consider using factors from 2-10 times tables");
          difficultyLevel = "challenge";
        }
      }
      break;
    }

    case "division": {
      const divStandards = YEAR_3_STANDARDS.division;
      const maxNum = Math.max(...numbers, 0);

      if (maxNum > divStandards.max_dividend) {
        issues.push(`Dividend ${maxNum} exceeds Year 3 maximum of ${divStandards.max_dividend}`);
        yearGroupMatch = false;
      }

      // Check for division by appropriate numbers
      if (numbers.length >= 2) {
        const divisor = numbers[1];
        if (!divStandards.tables.includes(divisor)) {
          suggestions.push(`Consider using a divisor from Year 3 tables: ${divStandards.tables.join(", ")}`);
        }
      }
      break;
    }

    case "addition":
    case "subtraction": {
      const opStandards = YEAR_3_STANDARDS[topic];
      const maxNum = Math.max(...numbers, 0);

      if (maxNum > opStandards.max_sum || maxNum > opStandards.max_value) {
        issues.push(`Numbers exceed Year 3 ${topic} range (max ${opStandards.max_sum || opStandards.max_value})`);
        yearGroupMatch = false;
      }

      if (maxNum > opStandards.mental_max) {
        difficultyLevel = "challenge";
        suggestions.push("This may require written methods rather than mental calculation");
      }
      break;
    }

    case "place_value": {
      const pvStandards = YEAR_3_STANDARDS.place_value;
      const maxNum = Math.max(...numbers, 0);

      if (maxNum > pvStandards.max_number) {
        issues.push(`Number ${maxNum} exceeds Year 3 place value range (max 1000)`);
        yearGroupMatch = false;
      }

      // Check for appropriate concepts
      const lowerQ = question.toLowerCase();
      const hasConcept = pvStandards.concepts.some((c) => lowerQ.includes(c));
      if (!hasConcept) {
        suggestions.push(`Consider explicitly referencing: ${pvStandards.concepts.join(", ")}`);
      }
      break;
    }

    case "word_problems": {
      const wpStandards = YEAR_3_STANDARDS.word_problems;

      // Check step count (approximate by counting operations)
      if (operations.length > wpStandards.max_steps) {
        issues.push(`Multi-step problem detected (${operations.length} steps). Year 3 should focus on 1-2 step problems`);
        difficultyLevel = "challenge";
      }

      // Check if operation is appropriate
      if (operations.length === 0) {
        issues.push("No mathematical operation detected in word problem");
        topicAppropriate = false;
      }

      // Vocabulary check
      if (question.length < 20) {
        suggestions.push("Consider adding more context to make the problem relatable");
      }
      break;
    }
  }

  // General checks
  if (question.length > 200) {
    suggestions.push("Consider simplifying - long questions may be difficult for Year 3 readers");
  }

  // Check for clear question format
  if (!question.includes("?") && !question.toLowerCase().includes("calculate") && !question.toLowerCase().includes("find")) {
    suggestions.push("Consider adding a clear question or instruction");
  }

  return {
    is_valid: issues.length === 0,
    issues,
    suggestions,
    curriculum_alignment: {
      topic_appropriate: topicAppropriate,
      difficulty_level: difficultyLevel,
      year_group_match: yearGroupMatch,
    },
  };
}
