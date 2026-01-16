"""
MCP Server for Dedalus Integration
Implements the Model Context Protocol for student analysis, curriculum validation, and benchmark checking.
"""

import json
import sys
from typing import Any, Dict, Optional
from dataclasses import dataclass, asdict

# Import tool functions
from student_analyzer import analyze_student_gaps, TOOL_METADATA as STUDENT_ANALYZER_METADATA
from curriculum_validator import validate_question, TOOL_METADATA as CURRICULUM_VALIDATOR_METADATA
from benchmark_checker import compare_to_benchmark, TOOL_METADATA as BENCHMARK_CHECKER_METADATA


# MCP Protocol Version
MCP_VERSION = "2024-11-05"

# Server metadata
SERVER_INFO = {
    "name": "dedalus-mcp-server",
    "version": "1.0.0",
    "description": "MCP server for Year 3 math diagnostic tools"
}

# Tool registry
TOOLS = {
    "analyze_student_gaps": {
        "metadata": STUDENT_ANALYZER_METADATA,
        "handler": analyze_student_gaps
    },
    "validate_question": {
        "metadata": CURRICULUM_VALIDATOR_METADATA,
        "handler": validate_question
    },
    "compare_to_benchmark": {
        "metadata": BENCHMARK_CHECKER_METADATA,
        "handler": compare_to_benchmark
    }
}


@dataclass
class MCPResponse:
    """Standard MCP response format"""
    jsonrpc: str = "2.0"
    id: Optional[int] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[Dict[str, Any]] = None


def create_error_response(id: Optional[int], code: int, message: str) -> Dict:
    """Create an MCP error response"""
    return asdict(MCPResponse(
        id=id,
        error={"code": code, "message": message}
    ))


def create_success_response(id: Optional[int], result: Any) -> Dict:
    """Create an MCP success response"""
    return asdict(MCPResponse(
        id=id,
        result=result
    ))


def handle_initialize(params: Dict) -> Dict:
    """Handle the initialize request"""
    return {
        "protocolVersion": MCP_VERSION,
        "capabilities": {
            "tools": {}
        },
        "serverInfo": SERVER_INFO
    }


def handle_tools_list() -> Dict:
    """Handle tools/list request - returns available tools"""
    tools_list = []
    for tool_name, tool_info in TOOLS.items():
        metadata = tool_info["metadata"]
        tools_list.append({
            "name": metadata["name"],
            "description": metadata["description"],
            "inputSchema": {
                "type": "object",
                "properties": metadata["parameters"],
                "required": list(metadata["parameters"].keys())
            }
        })
    return {"tools": tools_list}


def handle_tools_call(params: Dict) -> Dict:
    """Handle tools/call request - executes a tool"""
    tool_name = params.get("name")
    arguments = params.get("arguments", {})
    
    if tool_name not in TOOLS:
        raise ValueError(f"Unknown tool: {tool_name}")
    
    handler = TOOLS[tool_name]["handler"]
    
    # Call the appropriate handler based on the tool
    if tool_name == "analyze_student_gaps":
        result = handler(arguments)
    elif tool_name == "validate_question":
        question = arguments.get("question", "")
        topic = arguments.get("topic", "")
        result = handler(question, topic)
    elif tool_name == "compare_to_benchmark":
        generated_question = arguments.get("generated_question", "")
        topic = arguments.get("topic", "")
        result = handler(generated_question, topic)
    else:
        raise ValueError(f"No handler implementation for: {tool_name}")
    
    return {
        "content": [
            {
                "type": "text",
                "text": json.dumps(result, indent=2)
            }
        ]
    }


def process_request(request: Dict) -> Dict:
    """Process an incoming MCP request"""
    request_id = request.get("id")
    method = request.get("method", "")
    params = request.get("params", {})
    
    try:
        if method == "initialize":
            result = handle_initialize(params)
        elif method == "tools/list":
            result = handle_tools_list()
        elif method == "tools/call":
            result = handle_tools_call(params)
        elif method == "notifications/initialized":
            # Acknowledgment, no response needed
            return None
        elif method == "ping":
            result = {}
        else:
            return create_error_response(request_id, -32601, f"Method not found: {method}")
        
        return create_success_response(request_id, result)
    
    except Exception as e:
        return create_error_response(request_id, -32603, str(e))


def run_stdio_server():
    """Run the MCP server using stdio transport"""
    print(f"Starting {SERVER_INFO['name']} v{SERVER_INFO['version']}", file=sys.stderr)
    print(f"Protocol version: {MCP_VERSION}", file=sys.stderr)
    print("Listening for MCP requests on stdin...", file=sys.stderr)
    
    while True:
        try:
            # Read a line from stdin
            line = sys.stdin.readline()
            if not line:
                break
            
            line = line.strip()
            if not line:
                continue
            
            # Parse the JSON-RPC request
            try:
                request = json.loads(line)
            except json.JSONDecodeError as e:
                response = create_error_response(None, -32700, f"Parse error: {e}")
                print(json.dumps(response), flush=True)
                continue
            
            # Process the request
            response = process_request(request)
            
            # Send response (if any)
            if response is not None:
                print(json.dumps(response), flush=True)
        
        except KeyboardInterrupt:
            print("\nShutting down server...", file=sys.stderr)
            break
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            response = create_error_response(None, -32603, str(e))
            print(json.dumps(response), flush=True)


def run_http_server(host: str = "0.0.0.0", port: int = 8080):
    """Run the MCP server using HTTP transport (alternative mode)"""
    try:
        from http.server import HTTPServer, BaseHTTPRequestHandler
    except ImportError:
        print("HTTP server requires Python 3.x", file=sys.stderr)
        return
    
    class MCPHandler(BaseHTTPRequestHandler):
        def do_POST(self):
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            
            try:
                request = json.loads(body)
                response = process_request(request)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                
                if response:
                    self.wfile.write(json.dumps(response).encode('utf-8'))
            
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                error_response = create_error_response(None, -32603, str(e))
                self.wfile.write(json.dumps(error_response).encode('utf-8'))
        
        def log_message(self, format, *args):
            print(f"[HTTP] {args[0]}", file=sys.stderr)
    
    server = HTTPServer((host, port), MCPHandler)
    print(f"Starting HTTP MCP server on {host}:{port}", file=sys.stderr)
    server.serve_forever()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Dedalus MCP Server")
    parser.add_argument(
        "--transport",
        choices=["stdio", "http"],
        default="stdio",
        help="Transport mode: stdio (default) or http"
    )
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="HTTP host (default: 0.0.0.0)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8080,
        help="HTTP port (default: 8080)"
    )
    
    args = parser.parse_args()
    
    if args.transport == "stdio":
        run_stdio_server()
    else:
        run_http_server(args.host, args.port)
