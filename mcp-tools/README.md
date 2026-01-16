# MCP Tools for Adaptive Maths Tutor

Python-based Model Context Protocol (MCP) tools for the Adaptive Maths Tutor project. These tools are designed to integrate with the Dedalus MCP server for enhanced AI-driven tutoring capabilities.

## Overview

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `student_analyzer` | Identify learning gaps | Diagnostic scores, session history | Weak topics, difficulty recommendation, focus areas |
| `curriculum_validator` | Validate against UK Year 3 | Question text, topic | Validity status, issues, suggestions |
| `benchmark_checker` | Quality assessment | Generated question, topic | Quality score (0-10), pass/fail, improvements |

## Installation

```bash
cd mcp-tools
pip install -r requirements.txt
```

## Tool Details

### 1. Student Gap Analyzer (`student_analyzer.py`)

Analyzes student diagnostic data to identify knowledge gaps and recommend personalized learning paths.

**Function:** `analyze_student_gaps(student_data)`

**Input:**
```python
{
    "diagnostic_scores": {
        "multiplication_tables": 45,
        "division": 38,
        "addition_subtraction": 72
    },
    "recent_sessions": [
        {"questions_correct": 6, "questions_total": 10},
        {"questions_correct": 7, "questions_total": 10}
    ]
}
```

**Output:**
```python
{
    "weak_topics": ["division", "multiplication_tables"],
    "recommended_difficulty": "foundation",
    "focus_areas": [
        {"topic": "multiplication_tables", "priority": "high", "reason": "prerequisite_gap"},
        {"topic": "division", "priority": "high", "reason": "diagnostic_gap"}
    ]
}
```

**Features:**
- Identifies topics below 60% threshold
- Detects prerequisite gaps (e.g., weak multiplication affects division)
- Tracks improving/declining trends across sessions
- Recommends `foundation`, `core`, or `challenge` difficulty

---

### 2. Curriculum Validator (`curriculum_validator.py`)

Validates questions against UK National Curriculum Year 3 standards.

**Function:** `validate_question(question, topic)`

**UK Year 3 Standards Enforced:**
- Multiplication: Tables 2-10, products up to 100
- Division: Dividends up to 100, divisors 2, 3, 4, 5, 8, 10
- Addition/Subtraction: Numbers up to 1000
- Word Problems: One-step only
- Place Value: Up to 1000

**Input:**
```python
question = {
    "text": "Sam has 24 stickers. He shares them among 4 friends. How many each?",
    "answer": 6,
    "operation": "division"
}
topic = "division"
```

**Output:**
```python
{
    "is_valid": True,
    "issues": [],
    "suggestions": ["Consider ending with a question mark for clarity"]
}
```

**Checks:**
- Number ranges appropriate for Year 3
- Age-appropriate vocabulary (flags complex words)
- Sentence length (recommends under 20 words)
- Operation complexity (one-step for word problems)

---

### 3. Benchmark Checker (`benchmark_checker.py`)

Evaluates question quality against best practices for Year 3 maths education.

**Function:** `compare_to_benchmark(generated_question, topic)`

**Quality Criteria (each weighted 2.5 points):**
1. **Real-world context** - Uses relatable scenarios (shop, school, party)
2. **Clear language** - Unambiguous, proper question format
3. **Age-appropriate** - Child-friendly vocabulary and themes
4. **Concrete objects** - Tangible items (apples, toys, stickers)

**Input:**
```python
generated_question = {
    "text": "Emma has 24 stickers. She shares them equally among 4 friends. How many stickers does each friend get?",
    "answer": 6
}
topic = "division"
```

**Output:**
```python
{
    "quality_score": 9.2,
    "passes_benchmark": True,  # Score >= 7
    "improvements_needed": [],
    "criterion_scores": {
        "real_world_context": 1.0,
        "clear_language": 0.95,
        "age_appropriate": 1.0,
        "concrete_objects": 0.7
    }
}
```

---

## TOOL_METADATA Format

Each tool includes a `TOOL_METADATA` dictionary for MCP integration:

```python
TOOL_METADATA = {
    "name": "tool_function_name",
    "description": "What the tool does and when to use it",
    "parameters": {
        "param_name": {
            "type": "string|object|array|number",
            "description": "Parameter description",
            "properties": {},  # For objects
            "required": []      # For objects
        }
    },
    "returns": {
        "field_name": {
            "type": "string|boolean|array|number",
            "description": "What this return field contains"
        }
    }
}
```

---

## Usage Examples

### Standalone Python

```python
from student_analyzer import analyze_student_gaps
from curriculum_validator import validate_question
from benchmark_checker import compare_to_benchmark

# Analyze a student
result = analyze_student_gaps({
    "diagnostic_scores": {"multiplication": 40, "division": 35},
    "recent_sessions": []
})
print(result["weak_topics"])  # ['division', 'multiplication']

# Validate a question
validation = validate_question(
    {"text": "What is 150 divided by 3?", "answer": 50},
    "division"
)
print(validation["is_valid"])  # False (150 > max 100)

# Check quality
quality = compare_to_benchmark(
    {"text": "Calculate 8 x 7."},
    "multiplication"
)
print(quality["passes_benchmark"])  # False (lacks context)
```

### Running the MCP Server

#### Option 1: stdio Transport (Recommended for Dedalus)

```bash
python server.py --transport stdio
```

This runs the server listening on stdin/stdout, which is the standard MCP transport.

#### Option 2: HTTP Transport

```bash
python server.py --transport http --port 8080
```

#### Dedalus Configuration

Add this to your Dedalus MCP configuration:

```json
{
  "mcpServers": {
    "dedalus-math": {
      "command": "python",
      "args": ["path/to/mcp-tools/server.py", "--transport", "stdio"],
      "env": {}
    }
  }
}
```

#### Testing the Server

```bash
# Test tools/list
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | python server.py

# Test a tool call
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"validate_question","arguments":{"question":"What is 5 × 3?","topic":"multiplication"}}}' | python server.py
```

---

## Project Context

These tools support the **Adaptive Maths Tutor POC** - a Year 3 maths learning platform that:
- Diagnoses learning gaps through interactive assessments
- Adapts question difficulty in real-time
- Provides parent-friendly progress signals

**Tech Stack:**
- Frontend: React, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Lovable Cloud (Supabase)
- AI: Google Gemini 2.5 Flash (question generation)
- Voice: ElevenLabs TTS

---

## Contributing

1. Follow existing code patterns
2. Include `TOOL_METADATA` for all new tools
3. Add type hints and docstrings
4. Include example usage in `if __name__ == "__main__"`

---

## License

Part of the Adaptive Maths Tutor project.
