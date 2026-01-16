#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { analyzeStudentGaps, STUDENT_ANALYZER_TOOL } from "./tools/studentAnalyzer.js";
import { validateQuestion, CURRICULUM_VALIDATOR_TOOL } from "./tools/curriculumValidator.js";
import { compareToBenchmark, BENCHMARK_CHECKER_TOOL } from "./tools/benchmarkChecker.js";

const server = new Server(
  {
    name: "numbersense-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      STUDENT_ANALYZER_TOOL,
      CURRICULUM_VALIDATOR_TOOL,
      BENCHMARK_CHECKER_TOOL,
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "analyze_student_gaps": {
        const result = analyzeStudentGaps(
          args?.diagnostic_scores as Record<string, number>,
          args?.recent_sessions as Array<{ topic: string; score: number; date: string }>
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "validate_question": {
        const result = validateQuestion(
          args?.question as string,
          args?.topic as string
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "compare_to_benchmark": {
        const result = compareToBenchmark(
          args?.generated_question as string,
          args?.topic as string
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("NumberSense MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
