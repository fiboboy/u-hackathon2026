import type { IncomingMessage, ServerResponse } from "node:http";
import mcpHandler from "../mcp.js";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Delegate POST messages to mcpHandler
  return mcpHandler(req, res);
}
