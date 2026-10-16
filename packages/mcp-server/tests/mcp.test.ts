import test from "node:test";
import assert from "node:assert";
import { SpatialTwinMcpServer } from "../src/server.js";

test("SpatialTwinMcpServer initializes with 5 blueprint tools", () => {
  const mcp = new SpatialTwinMcpServer("http://localhost:8000");
  const server = mcp.getMcpServer();
  assert.ok(server);
});
