"""
Question Quality Benchmark Checker for Adaptive Maths Tutor
Compares generated questions against quality standards for Year 3 students.
"""

from typing import Dict, List, Any, Optional
import re

TOOL_METADATA = {
    "name": "compare_to_benchmark",
    "description": "Evaluates a generated maths question against quality benchmarks for Year 3 students. Checks for real-world context, clear language, age-appropriateness, and use of concrete objects.",
    "parameters": {
        "generated_question": {
            "type": "object",
            "description": "The question to evaluate",
            "properties": {
                "text": {"type": "string", "description": "The question text"},
                "answer": {"type": "number", "description": "The correct answer"},
                "topic": {"type": "string", "description": "The maths topic"},
                "difficulty": {"type": "string", "description": "Difficulty level"}
            },
            "required": ["text"]
        },
        "topic": {
            "type": "string",
            "description": "The curriculum topic for context-specific benchmarks"
        }
    },
    "returns": {
        "quality_score": {
            "type": "number",
            "description": "Overall quality score from 0-10"
        },
        "passes_benchmark": {
            "type": "boolean",
            "description": "True if quality_score >= 7"
        },
        "improvements_needed": {
            "type": "array",
            "description": "List of specific improvements to make"
        }
    }
}

# Quality benchmark criteria weights
CRITERIA_WEIGHTS = {
    "real_world_context": 2.5,
    "clear_language": 2.5,
    "age_appropriate": 2.5,
    "concrete_objects": 2.5
}

PASSING_THRESHOLD = 7.0

# Concrete objects appropriate for Year 3 contexts
CONCRETE_OBJECTS = [
    # Food
    "apple", "apples", "orange", "oranges", "banana", "bananas", "sweet", "sweets",
    "cake", "cakes", "biscuit", "biscuits", "cookie", "cookies", "pizza", "sandwich",
    
    # Toys & Games
    "toy", "toys", "ball", "balls", "marble", "marbles", "card", "cards", "dice",
    "teddy", "teddies", "doll", "dolls", "car", "cars", "lego", "blocks",
    
    # School items
    "pencil", "pencils", "pen", "pens", "book", "books", "ruler", "rulers",
    "crayon", "crayons", "sticker", "stickers", "eraser", "erasers", "notebook",
    
    # Money
    "penny", "pennies", "pound", "pounds", "coin", "coins", "pence", "note", "notes",
    
    # Nature
    "flower", "flowers", "tree", "trees", "leaf", "leaves", "bird", "birds",
    "butterfly", "butterflies", "ladybird", "ladybirds",
    
    # People & Places
    "child", "children", "friend", "friends", "pupil", "pupils", "team", "teams",
    "class", "group", "groups", "family", "families",
    
    # Containers
    "box", "boxes", "bag", "bags", "basket", "baskets", "jar", "jars", "packet", "packets"
]

# Real-world context scenarios
CONTEXT_SCENARIOS = [
    "shop", "store", "school", "playground", "party", "birthday", "garden",
    "kitchen", "classroom", "library", "park", "home", "farm", "zoo",
    "picnic", "fair", "market", "bakery", "sports", "game"
]

# Clear language indicators
CLEAR_LANGUAGE_PATTERNS = [
    r"how many",
    r"what is",
    r"find the",
    r"work out",
    r"calculate",  # Borderline for Year 3, but acceptable
]

# Action verbs appropriate for Year 3
AGE_APPROPRIATE_VERBS = [
    "has", "have", "gives", "gave", "gets", "got", "shares", "shared",
    "buys", "bought", "sells", "sold", "finds", "found", "picks", "picked",
    "collects", "collected", "counts", "counted", "adds", "added",
    "takes", "took", "eats", "ate", "makes", "made", "puts", "put"
]

# Names suitable for Year 3 questions
CHILD_NAMES = [
    "sam", "emma", "jack", "lily", "oliver", "sophie", "harry", "mia",
    "charlie", "ella", "thomas", "grace", "george", "ruby", "james", "chloe",
    "leo", "ava", "noah", "isla", "oscar", "poppy", "max", "rosie"
]


def compare_to_benchmark(generated_question: Dict[str, Any], topic: str) -> Dict[str, Any]:
    """
    Compare a generated question against quality benchmarks.
    
    Args:
        generated_question: Dictionary containing:
            - text: The question text
            - answer: The correct answer (optional)
            - topic: The maths topic (optional)
            - difficulty: Difficulty level (optional)
        topic: The curriculum topic for context
    
    Returns:
        Dictionary containing:
            - quality_score: Score from 0-10
            - passes_benchmark: True if score >= 7
            - improvements_needed: List of improvement suggestions
    """
    text = generated_question.get("text", "")
    
    # Evaluate each criterion
    scores = {}
    improvements = []
    
    # Check real-world context
    context_score, context_improvements = _check_real_world_context(text, topic)
    scores["real_world_context"] = context_score
    improvements.extend(context_improvements)
    
    # Check clear language
    language_score, language_improvements = _check_clear_language(text)
    scores["clear_language"] = language_score
    improvements.extend(language_improvements)
    
    # Check age appropriateness
    age_score, age_improvements = _check_age_appropriate(text)
    scores["age_appropriate"] = age_score
    improvements.extend(age_improvements)
    
    # Check concrete objects
    objects_score, objects_improvements = _check_concrete_objects(text, topic)
    scores["concrete_objects"] = objects_score
    improvements.extend(objects_improvements)
    
    # Calculate weighted total
    total_score = sum(
        scores[criterion] * weight 
        for criterion, weight in CRITERIA_WEIGHTS.items()
    ) / sum(CRITERIA_WEIGHTS.values()) * 10
    
    # Round to 1 decimal place
    total_score = round(total_score, 1)
    
    return {
        "quality_score": total_score,
        "passes_benchmark": total_score >= PASSING_THRESHOLD,
        "improvements_needed": improvements,
        "criterion_scores": scores  # Bonus: detailed breakdown
    }


def _check_real_world_context(text: str, topic: str) -> tuple[float, List[str]]:
    """Check if question has real-world context."""
    text_lower = text.lower()
    improvements = []
    
    # Check for context scenarios
    has_scenario = any(scenario in text_lower for scenario in CONTEXT_SCENARIOS)
    
    # Check for character names
    has_character = any(name in text_lower for name in CHILD_NAMES)
    
    # Check for action verbs
    has_action = any(verb in text_lower for verb in AGE_APPROPRIATE_VERBS)
    
    score = 0.0
    
    if has_scenario:
        score += 0.4
    else:
        improvements.append("Add a real-world scenario (e.g., shop, school, party)")
    
    if has_character:
        score += 0.3
    else:
        improvements.append("Include a character name to make it relatable")
    
    if has_action:
        score += 0.3
    else:
        improvements.append("Use action verbs (e.g., 'Sam buys', 'Emma shares')")
    
    return score, improvements


def _check_clear_language(text: str) -> tuple[float, List[str]]:
    """Check if language is clear and unambiguous."""
    text_lower = text.lower()
    improvements = []
    score = 0.0
    
    # Check for clear question patterns
    has_clear_question = any(
        re.search(pattern, text_lower) 
        for pattern in CLEAR_LANGUAGE_PATTERNS
    )
    
    if has_clear_question:
        score += 0.3
    else:
        improvements.append("Start with a clear question phrase (e.g., 'How many...?')")
    
    # Check for question mark
    if "?" in text:
        score += 0.2
    else:
        improvements.append("End with a question mark")
    
    # Check sentence length (not too long)
    words = text.split()
    if len(words) <= 25:
        score += 0.25
    else:
        improvements.append(f"Shorten the question (currently {len(words)} words, aim for under 25)")
    
    # Check for ambiguous words
    ambiguous_words = ["some", "few", "several", "many", "lots"]
    has_ambiguous = any(word in text_lower for word in ambiguous_words)
    
    if not has_ambiguous:
        score += 0.25
    else:
        improvements.append("Replace vague words ('some', 'few') with specific numbers")
    
    return score, improvements


def _check_age_appropriate(text: str) -> tuple[float, List[str]]:
    """Check if content is age-appropriate for Year 3."""
    text_lower = text.lower()
    improvements = []
    score = 0.0
    
    # Check for child-friendly vocabulary
    complex_words = [
        "calculate", "determine", "evaluate", "compute", "quotient",
        "dividend", "multiplicand", "subsequently", "therefore", "hence"
    ]
    
    has_complex = any(word in text_lower for word in complex_words)
    
    if not has_complex:
        score += 0.4
    else:
        found = [w for w in complex_words if w in text_lower]
        improvements.append(f"Simplify complex words: {found}")
    
    # Check for appropriate themes
    inappropriate_themes = [
        "death", "violence", "alcohol", "gambling", "war", "weapon",
        "scary", "horror", "blood", "injury"
    ]
    
    has_inappropriate = any(theme in text_lower for theme in inappropriate_themes)
    
    if not has_inappropriate:
        score += 0.3
    else:
        improvements.append("Remove any inappropriate themes")
    
    # Check for positive/neutral tone
    positive_words = [
        "share", "give", "help", "friend", "together", "fun", "happy",
        "play", "game", "win", "collect", "find"
    ]
    
    has_positive = any(word in text_lower for word in positive_words)
    
    if has_positive:
        score += 0.3
    else:
        improvements.append("Consider adding positive context (sharing, helping, playing)")
    
    return score, improvements


def _check_concrete_objects(text: str, topic: str) -> tuple[float, List[str]]:
    """Check if question uses concrete, tangible objects."""
    text_lower = text.lower()
    improvements = []
    score = 0.0
    
    # Check for concrete objects
    found_objects = [obj for obj in CONCRETE_OBJECTS if obj in text_lower]
    
    if len(found_objects) >= 1:
        score += 0.5
        if len(found_objects) >= 2:
            score += 0.2  # Bonus for multiple concrete items
    else:
        improvements.append("Use concrete objects children can visualize (e.g., apples, toys, stickers)")
    
    # Check for numbers (should have specific quantities)
    numbers = re.findall(r'\b\d+\b', text)
    
    if numbers:
        score += 0.3
    else:
        improvements.append("Include specific numbers rather than vague quantities")
    
    # Topic-specific object suggestions
    topic_objects = {
        "multiplication": ["groups", "rows", "arrays", "packs", "bags"],
        "division": ["shared", "equal", "groups", "each", "everyone"],
        "addition": ["altogether", "total", "more", "combined"],
        "subtraction": ["left", "remaining", "gave away", "fewer"]
    }
    
    if topic in topic_objects:
        has_topic_words = any(word in text_lower for word in topic_objects[topic])
        if not has_topic_words:
            improvements.append(f"For {topic}, consider using: {topic_objects[topic][:3]}")
    
    return score, improvements


# Example usage
if __name__ == "__main__":
    # High quality question
    good_question = {
        "text": "Emma has 24 stickers. She shares them equally among 4 friends. How many stickers does each friend get?",
        "answer": 6,
        "topic": "division"
    }
    
    result = compare_to_benchmark(good_question, "division")
    print("Good Question Test:")
    print(f"  Quality Score: {result['quality_score']}/10")
    print(f"  Passes Benchmark: {result['passes_benchmark']}")
    print(f"  Improvements: {result['improvements_needed']}")
    print(f"  Criterion Scores: {result['criterion_scores']}")
    
    print()
    
    # Poor quality question
    poor_question = {
        "text": "Calculate 48 divided by 8.",
        "answer": 6,
        "topic": "division"
    }
    
    result = compare_to_benchmark(poor_question, "division")
    print("Poor Question Test:")
    print(f"  Quality Score: {result['quality_score']}/10")
    print(f"  Passes Benchmark: {result['passes_benchmark']}")
    print(f"  Improvements: {result['improvements_needed']}")
    print(f"  Criterion Scores: {result['criterion_scores']}")
