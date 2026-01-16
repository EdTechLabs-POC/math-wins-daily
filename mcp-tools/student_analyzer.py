"""
Student Gap Analyzer for Adaptive Maths Tutor
Analyzes diagnostic data to identify learning gaps and recommend focus areas.
"""

from typing import Dict, List, Any

TOOL_METADATA = {
    "name": "analyze_student_gaps",
    "description": "Analyzes student diagnostic scores and recent session data to identify knowledge gaps, recommend appropriate difficulty levels, and suggest focus areas for adaptive learning.",
    "parameters": {
        "student_data": {
            "type": "object",
            "description": "Student performance data containing diagnostic scores and session history",
            "properties": {
                "diagnostic_scores": {
                    "type": "object",
                    "description": "Dictionary mapping topic names to scores (0-100)"
                },
                "recent_sessions": {
                    "type": "array",
                    "description": "List of recent practice session objects with performance metrics"
                }
            },
            "required": ["diagnostic_scores", "recent_sessions"]
        }
    },
    "returns": {
        "weak_topics": {
            "type": "array",
            "description": "List of topics where student scored below threshold"
        },
        "recommended_difficulty": {
            "type": "string",
            "description": "Suggested difficulty level: 'foundation', 'core', or 'challenge'"
        },
        "focus_areas": {
            "type": "array",
            "description": "Prioritized list of specific skills to practice"
        }
    }
}

# Thresholds for gap detection
WEAK_TOPIC_THRESHOLD = 60  # Below this score = weak topic
STRONG_TOPIC_THRESHOLD = 80  # Above this score = strong topic
MIN_SESSIONS_FOR_TREND = 3  # Minimum sessions to detect improvement/decline

# UK Year 3 topic hierarchy for identifying prerequisite gaps
TOPIC_PREREQUISITES = {
    "multiplication_tables": ["counting", "addition"],
    "division": ["multiplication_tables", "subtraction"],
    "word_problems": ["reading_comprehension", "addition", "subtraction"],
    "fractions": ["division", "equal_parts"],
    "place_value": ["counting", "number_recognition"],
    "addition_subtraction": ["place_value", "counting"]
}


def analyze_student_gaps(student_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyze student diagnostic data to identify gaps and recommend focus areas.
    
    Args:
        student_data: Dictionary containing:
            - diagnostic_scores: Dict mapping topic names to scores (0-100)
            - recent_sessions: List of session objects with performance data
    
    Returns:
        Dictionary containing:
            - weak_topics: List of topics needing improvement
            - recommended_difficulty: Suggested difficulty level
            - focus_areas: Prioritized list of skills to practice
    """
    diagnostic_scores = student_data.get("diagnostic_scores", {})
    recent_sessions = student_data.get("recent_sessions", [])
    
    # Identify weak topics based on diagnostic scores
    weak_topics = _identify_weak_topics(diagnostic_scores)
    
    # Analyze session trends to refine understanding
    session_trends = _analyze_session_trends(recent_sessions)
    
    # Determine recommended difficulty based on overall performance
    recommended_difficulty = _determine_difficulty(diagnostic_scores, session_trends)
    
    # Generate prioritized focus areas
    focus_areas = _generate_focus_areas(weak_topics, diagnostic_scores, session_trends)
    
    return {
        "weak_topics": weak_topics,
        "recommended_difficulty": recommended_difficulty,
        "focus_areas": focus_areas
    }


def _identify_weak_topics(scores: Dict[str, float]) -> List[str]:
    """Identify topics where student is struggling."""
    weak = []
    for topic, score in scores.items():
        if score < WEAK_TOPIC_THRESHOLD:
            weak.append(topic)
    
    # Sort by score (weakest first)
    weak.sort(key=lambda t: scores.get(t, 0))
    return weak


def _analyze_session_trends(sessions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze recent session data for performance trends."""
    if not sessions:
        return {"trend": "insufficient_data", "improving_topics": [], "declining_topics": []}
    
    # Calculate average performance over recent sessions
    total_correct = 0
    total_questions = 0
    topic_performance = {}
    
    for session in sessions:
        correct = session.get("questions_correct", 0)
        total = session.get("questions_total", 1)
        total_correct += correct
        total_questions += total
        
        # Track per-topic performance if available
        session_topics = session.get("topics_covered", {})
        for topic, perf in session_topics.items():
            if topic not in topic_performance:
                topic_performance[topic] = []
            topic_performance[topic].append(perf)
    
    # Determine overall trend
    avg_score = (total_correct / total_questions * 100) if total_questions > 0 else 0
    
    # Identify improving and declining topics
    improving = []
    declining = []
    
    for topic, performances in topic_performance.items():
        if len(performances) >= MIN_SESSIONS_FOR_TREND:
            recent_avg = sum(performances[-3:]) / 3
            earlier_avg = sum(performances[:-3]) / max(len(performances) - 3, 1)
            
            if recent_avg > earlier_avg + 10:
                improving.append(topic)
            elif recent_avg < earlier_avg - 10:
                declining.append(topic)
    
    trend = "stable"
    if len(improving) > len(declining):
        trend = "improving"
    elif len(declining) > len(improving):
        trend = "declining"
    
    return {
        "trend": trend,
        "average_score": avg_score,
        "improving_topics": improving,
        "declining_topics": declining
    }


def _determine_difficulty(scores: Dict[str, float], trends: Dict[str, Any]) -> str:
    """Determine appropriate difficulty level."""
    if not scores:
        return "foundation"
    
    avg_score = sum(scores.values()) / len(scores)
    trend = trends.get("trend", "stable")
    
    # Adjust based on trends
    if trend == "improving":
        avg_score += 5  # Slight boost for improving students
    elif trend == "declining":
        avg_score -= 5  # More support for declining students
    
    if avg_score >= 75:
        return "challenge"
    elif avg_score >= 50:
        return "core"
    else:
        return "foundation"


def _generate_focus_areas(
    weak_topics: List[str], 
    scores: Dict[str, float],
    trends: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Generate prioritized list of focus areas with specific skills."""
    focus_areas = []
    
    # Add declining topics as high priority
    declining = trends.get("declining_topics", [])
    for topic in declining:
        if topic not in weak_topics:
            focus_areas.append({
                "topic": topic,
                "priority": "high",
                "reason": "recent_decline",
                "suggested_approach": "review_fundamentals"
            })
    
    # Add weak topics based on prerequisites
    for topic in weak_topics:
        # Check if prerequisites are also weak
        prereqs = TOPIC_PREREQUISITES.get(topic, [])
        weak_prereqs = [p for p in prereqs if p in weak_topics]
        
        if weak_prereqs:
            # Focus on prerequisites first
            for prereq in weak_prereqs:
                if not any(f["topic"] == prereq for f in focus_areas):
                    focus_areas.append({
                        "topic": prereq,
                        "priority": "high",
                        "reason": "prerequisite_gap",
                        "suggested_approach": "build_foundation"
                    })
        
        # Then add the topic itself
        if not any(f["topic"] == topic for f in focus_areas):
            priority = "high" if scores.get(topic, 0) < 40 else "medium"
            focus_areas.append({
                "topic": topic,
                "priority": priority,
                "reason": "diagnostic_gap",
                "suggested_approach": "targeted_practice"
            })
    
    # Limit to top 5 focus areas
    return focus_areas[:5]


# Example usage
if __name__ == "__main__":
    sample_data = {
        "diagnostic_scores": {
            "multiplication_tables": 45,
            "division": 38,
            "addition_subtraction": 72,
            "place_value": 65,
            "word_problems": 55
        },
        "recent_sessions": [
            {"questions_correct": 6, "questions_total": 10, "topics_covered": {"multiplication_tables": 50}},
            {"questions_correct": 7, "questions_total": 10, "topics_covered": {"multiplication_tables": 60}},
            {"questions_correct": 8, "questions_total": 10, "topics_covered": {"multiplication_tables": 70}}
        ]
    }
    
    result = analyze_student_gaps(sample_data)
    print("Analysis Result:")
    print(f"  Weak Topics: {result['weak_topics']}")
    print(f"  Recommended Difficulty: {result['recommended_difficulty']}")
    print(f"  Focus Areas: {result['focus_areas']}")
