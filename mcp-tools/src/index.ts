#!/usr/bin/env node
import express, { Request, Response } from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { analyzeStudentGaps, STUDENT_ANALYZER_TOOL } from "./tools/studentAnalyzer.js";
import { validateQuestion, CURRICULUM_VALIDATOR_TOOL } from "./tools/curriculumValidator.js";
import { compareToBenchmark, BENCHMARK_CHECKER_TOOL } from "./tools/benchmarkChecker.js";

function createServer(): Server {
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

  return server;
}

const app = express();
app.use(express.json());

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", server: "numbersense-mcp", version: "1.0.0" });
});

// MCP endpoint - stateless mode (new server/transport per request)
app.post("/mcp", async (req: Request, res: Response) => {
  try {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode
    });

    res.on("close", () => {
      transport.close();
      server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

// SSE notifications not supported in stateless mode
app.get("/mcp", (_req: Request, res: Response) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed. Use POST for MCP requests.",
    },
    id: null,
  });
});

// Session termination not needed in stateless mode
app.delete("/mcp", (_req: Request, res: Response) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed.",
    },
    id: null,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`NumberSense MCP HTTP Server listening on port ${PORT}`);
  console.log(`MCP endpoint: POST http://localhost:${PORT}/mcp`);
  console.log(`Health check: GET http://localhost:${PORT}/health`);
});
