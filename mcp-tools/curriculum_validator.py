"""
UK Year 3 Curriculum Validator for Adaptive Maths Tutor
Validates questions against National Curriculum standards.
"""

from typing import Dict, List, Any, Optional
import re

TOOL_METADATA = {
    "name": "validate_question",
    "description": "Validates a maths question against UK Year 3 National Curriculum standards. Checks topic appropriateness, number ranges, operation complexity, and vocabulary level.",
    "parameters": {
        "question": {
            "type": "object",
            "description": "The question to validate",
            "properties": {
                "text": {"type": "string", "description": "The question text"},
                "answer": {"type": "number", "description": "The correct answer"},
                "operation": {"type": "string", "description": "The mathematical operation involved"},
                "numbers_used": {"type": "array", "description": "Numbers appearing in the question"}
            },
            "required": ["text", "answer"]
        },
        "topic": {
            "type": "string",
            "description": "The curriculum topic (e.g., 'multiplication', 'division', 'word_problems')"
        }
    },
    "returns": {
        "is_valid": {
            "type": "boolean",
            "description": "Whether the question meets Year 3 standards"
        },
        "issues": {
            "type": "array",
            "description": "List of validation issues found"
        },
        "suggestions": {
            "type": "array",
            "description": "Suggestions for improving the question"
        }
    }
}

# UK Year 3 National Curriculum Standards
YEAR_3_STANDARDS = {
    "multiplication": {
        "tables": list(range(2, 11)),  # 2-10 times tables
        "max_product": 100,
        "description": "Recall and use multiplication facts for 2, 3, 4, 5, 8, 10 tables"
    },
    "division": {
        "max_dividend": 100,
        "divisors": [2, 3, 4, 5, 8, 10],
        "description": "Divide numbers up to 100 by 2, 3, 4, 5, 8, 10"
    },
    "addition": {
        "max_sum": 1000,
        "description": "Add numbers with up to 3 digits using formal written methods"
    },
    "subtraction": {
        "max_minuend": 1000,
        "description": "Subtract numbers with up to 3 digits using formal written methods"
    },
    "place_value": {
        "max_number": 1000,
        "description": "Recognise place value of each digit in 3-digit numbers"
    },
    "word_problems": {
        "steps": 1,  # One-step problems
        "operations": ["addition", "subtraction", "multiplication", "division"],
        "description": "Solve one-step problems involving all four operations"
    },
    "fractions": {
        "denominators": [2, 3, 4, 5, 8, 10],
        "description": "Recognise and use fractions with small denominators"
    }
}

# Vocabulary appropriate for Year 3 (ages 7-8)
APPROPRIATE_VOCABULARY = {
    "number_words": ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", 
                     "eleven", "twelve", "hundred", "thousand"],
    "operation_words": ["add", "plus", "more", "total", "altogether", "sum",
                        "subtract", "minus", "take away", "less", "fewer", "difference",
                        "multiply", "times", "groups of", "lots of",
                        "divide", "share", "split", "equal groups"],
    "context_words": ["apples", "toys", "books", "children", "sweets", "pencils", "coins", 
                      "stickers", "marbles", "cakes", "biscuits", "flowers", "balls"]
}

# Words that may be too complex for Year 3
COMPLEX_VOCABULARY = [
    "calculate", "determine", "evaluate", "compute", "quotient", "dividend", 
    "multiplicand", "minuend", "subtrahend", "addend", "augend", "integer",
    "subsequently", "therefore", "hence", "consequently", "approximately"
]


def validate_question(question: Dict[str, Any], topic: str) -> Dict[str, Any]:
    """
    Validate a question against UK Year 3 curriculum standards.
    
    Args:
        question: Dictionary containing:
            - text: The question text
            - answer: The correct answer
            - operation: The mathematical operation (optional)
            - numbers_used: Numbers in the question (optional)
        topic: The curriculum topic being assessed
    
    Returns:
        Dictionary containing:
            - is_valid: Boolean indicating if question meets standards
            - issues: List of problems found
            - suggestions: List of improvement suggestions
    """
    issues = []
    suggestions = []
    
    text = question.get("text", "")
    answer = question.get("answer")
    numbers_used = question.get("numbers_used", _extract_numbers(text))
    operation = question.get("operation", _infer_operation(text))
    
    # Validate based on topic
    if topic in YEAR_3_STANDARDS:
        standard = YEAR_3_STANDARDS[topic]
        topic_issues, topic_suggestions = _validate_topic_standards(
            topic, numbers_used, answer, operation, standard
        )
        issues.extend(topic_issues)
        suggestions.extend(topic_suggestions)
    else:
        suggestions.append(f"Topic '{topic}' not in standard curriculum list. Consider using: {list(YEAR_3_STANDARDS.keys())}")
    
    # Validate vocabulary
    vocab_issues, vocab_suggestions = _validate_vocabulary(text)
    issues.extend(vocab_issues)
    suggestions.extend(vocab_suggestions)
    
    # Validate question structure
    structure_issues, structure_suggestions = _validate_structure(text, topic)
    issues.extend(structure_issues)
    suggestions.extend(structure_suggestions)
    
    is_valid = len(issues) == 0
    
    return {
        "is_valid": is_valid,
        "issues": issues,
        "suggestions": suggestions
    }


def _extract_numbers(text: str) -> List[int]:
    """Extract all numbers from question text."""
    numbers = re.findall(r'\b\d+\b', text)
    return [int(n) for n in numbers]


def _infer_operation(text: str) -> Optional[str]:
    """Infer the mathematical operation from question text."""
    text_lower = text.lower()
    
    if any(word in text_lower for word in ["times", "multiply", "groups of", "lots of"]):
        return "multiplication"
    elif any(word in text_lower for word in ["divide", "share", "split", "equal groups"]):
        return "division"
    elif any(word in text_lower for word in ["add", "plus", "more", "total", "altogether"]):
        return "addition"
    elif any(word in text_lower for word in ["subtract", "minus", "take away", "less", "fewer"]):
        return "subtraction"
    
    return None


def _validate_topic_standards(
    topic: str, 
    numbers: List[int], 
    answer: Any,
    operation: Optional[str],
    standard: Dict[str, Any]
) -> tuple[List[str], List[str]]:
    """Validate against topic-specific standards."""
    issues = []
    suggestions = []
    
    if topic == "multiplication":
        # Check times tables range
        for num in numbers:
            if num > 10 and num not in [n * m for n in range(2, 11) for m in range(1, 13)]:
                issues.append(f"Number {num} may be outside Year 3 multiplication range")
        
        if answer and answer > standard["max_product"]:
            issues.append(f"Product {answer} exceeds Year 3 maximum of {standard['max_product']}")
            suggestions.append("Consider using smaller factors to keep product under 100")
    
    elif topic == "division":
        if numbers:
            dividend = max(numbers)
            if dividend > standard["max_dividend"]:
                issues.append(f"Dividend {dividend} exceeds Year 3 maximum of {standard['max_dividend']}")
        
        # Check divisors
        for num in numbers:
            if num in [2, 3, 4, 5, 8, 10]:
                continue  # Valid divisor
            if num > 10:
                continue  # Likely the dividend
            if num not in standard["divisors"]:
                suggestions.append(f"Consider using divisors from {standard['divisors']}")
    
    elif topic == "addition":
        if answer and answer > standard["max_sum"]:
            issues.append(f"Sum {answer} exceeds Year 3 maximum of {standard['max_sum']}")
    
    elif topic == "subtraction":
        if numbers and max(numbers) > standard["max_minuend"]:
            issues.append(f"Number {max(numbers)} exceeds Year 3 maximum of {standard['max_minuend']}")
    
    elif topic == "word_problems":
        # Check for multi-step problems
        operation_count = sum(1 for op in ["add", "subtract", "multiply", "divide", "plus", "minus", "times"]
                             if op in str(numbers).lower())
        if operation_count > 1:
            issues.append("Year 3 word problems should be one-step only")
            suggestions.append("Simplify to a single operation")
    
    elif topic == "place_value":
        for num in numbers:
            if num > standard["max_number"]:
                issues.append(f"Number {num} exceeds Year 3 place value range of {standard['max_number']}")
    
    return issues, suggestions


def _validate_vocabulary(text: str) -> tuple[List[str], List[str]]:
    """Check vocabulary is age-appropriate."""
    issues = []
    suggestions = []
    
    text_lower = text.lower()
    
    # Check for complex vocabulary
    for word in COMPLEX_VOCABULARY:
        if word in text_lower:
            issues.append(f"Vocabulary '{word}' may be too complex for Year 3")
            suggestions.append(f"Consider simpler alternatives for '{word}'")
    
    # Check sentence length (Year 3 should have shorter sentences)
    sentences = text.split('.')
    for sentence in sentences:
        word_count = len(sentence.split())
        if word_count > 20:
            suggestions.append("Consider shorter sentences (under 20 words) for Year 3")
            break
    
    return issues, suggestions


def _validate_structure(text: str, topic: str) -> tuple[List[str], List[str]]:
    """Validate question structure."""
    issues = []
    suggestions = []
    
    # Check for question mark
    if '?' not in text:
        suggestions.append("Consider ending with a question mark for clarity")
    
    # Check minimum length
    if len(text) < 10:
        issues.append("Question text too short - may lack context")
    
    # For word problems, check for context
    if topic == "word_problems":
        has_context = any(word in text.lower() for word in APPROPRIATE_VOCABULARY["context_words"])
        if not has_context:
            suggestions.append("Word problems should include real-world context (e.g., apples, toys, books)")
    
    return issues, suggestions


# Example usage
if __name__ == "__main__":
    # Valid question
    valid_q = {
        "text": "Sam has 24 stickers. He shares them equally among 4 friends. How many stickers does each friend get?",
        "answer": 6,
        "operation": "division"
    }
    
    result = validate_question(valid_q, "division")
    print("Valid Question Test:")
    print(f"  Is Valid: {result['is_valid']}")
    print(f"  Issues: {result['issues']}")
    print(f"  Suggestions: {result['suggestions']}")
    
    print()
    
    # Invalid question (numbers too large)
    invalid_q = {
        "text": "Calculate the quotient when 500 is divided by 25.",
        "answer": 20,
        "operation": "division"
    }
    
    result = validate_question(invalid_q, "division")
    print("Invalid Question Test:")
    print(f"  Is Valid: {result['is_valid']}")
    print(f"  Issues: {result['issues']}")
    print(f"  Suggestions: {result['suggestions']}")
