# NumberSense MCP Server

MCP (Model Context Protocol) server for analyzing student maths progress, validating questions against UK Year 3 curriculum, and benchmarking question quality.

## Quick Start

```bash
cd mcp-tools
npm install
npm run build
npm start
```

## Dedalus Configuration

Add to your Dedalus MCP settings:

```json
{
  "mcpServers": {
    "numbersense": {
      "command": "node",
      "args": ["/path/to/mcp-tools/dist/index.js"]
    }
  }
}
```

## Available Tools

### 1. `analyze_student_gaps`
Analyzes student diagnostic data to identify knowledge gaps and recommend focus areas.

**Parameters:**
- `diagnostic_scores`: Object mapping topics to scores (0-100)
- `recent_sessions`: Array of session objects with topic, score, date

**Returns:** `weak_topics`, `recommended_difficulty`, `focus_areas`, `overall_readiness`

### 2. `validate_question`
Validates questions against UK National Curriculum Year 3 standards.

**Parameters:**
- `question`: The question text to validate
- `topic`: Mathematical topic (multiplication, division, addition, place_value, word_problems)

**Returns:** `is_valid`, `issues`, `suggestions`, `curriculum_alignment`

**Year 3 Standards:**
- Multiplication tables: 2, 3, 4, 5, 8, 10
- Division: max dividend 100
- Addition/Subtraction: up to 1000
- Place value: to 1000
- Word problems: 1-2 steps

### 3. `compare_to_benchmark`
Evaluates question quality for Year 3 students.

**Parameters:**
- `generated_question`: The question to evaluate
- `topic`: The mathematical topic

**Returns:** `quality_score` (0-10), `passes_benchmark` (≥7), `criteria_scores`, `improvements_needed`

**Quality Criteria:**
- Real-world context (25%)
- Clear language (30%)
- Age-appropriate (25%)
- Concrete objects (20%)

## Development

```bash
npm run dev  # Watch mode for development
```

## Project Structure

```
mcp-tools/
├── src/
│   ├── index.ts              # MCP server entry point
│   └── tools/
│       ├── studentAnalyzer.ts
│       ├── curriculumValidator.ts
│       └── benchmarkChecker.ts
├── dist/                      # Compiled output
├── package.json
└── tsconfig.json
```
