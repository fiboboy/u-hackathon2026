import type { IncomingMessage, ServerResponse } from "node:http";
import { equipmentStore } from "./_lib/equipmentStore.js";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const idQuery = url.searchParams.get("id");
  const roomQuery = url.searchParams.get("room") || undefined;
  const categoryQuery = url.searchParams.get("category") || undefined;
  const statusQuery = url.searchParams.get("status") || undefined;

  // GET: List or fetch by ID
  if (req.method === "GET") {
    if (idQuery) {
      const item = equipmentStore.get(idQuery);
      if (!item) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Equipment not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, equipment: item }));
      return;
    }

    const list = equipmentStore.list({
      room: roomQuery,
      category: categoryQuery,
      status: statusQuery
    });
    const stats = equipmentStore.getStats();

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: true,
        count: list.length,
        summary: stats,
        equipment: list
      })
    );
    return;
  }

  // Parse Body for POST / PATCH
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const rawBody = Buffer.concat(chunks).toString("utf-8");
  let body: any = {};
  if (rawBody.trim()) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Invalid JSON body" }));
      return;
    }
  }

  // POST: Add equipment
  if (req.method === "POST") {
    try {
      if (!body.id || !body.name) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Fields 'id' and 'name' are required" }));
        return;
      }
      const created = equipmentStore.add(body);
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, equipment: created }));
    } catch (err: any) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // DELETE: Remove equipment
  if (req.method === "DELETE") {
    const targetId = idQuery || body.id;
    if (!targetId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Parameter 'id' is required" }));
      return;
    }
    try {
      const removed = equipmentStore.remove(targetId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          message: `Equipment '${targetId}' removed`,
          removed
        })
      );
    } catch (err: any) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // PATCH: Update equipment
  if (req.method === "PATCH") {
    const targetId = idQuery || body.id;
    if (!targetId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Parameter 'id' is required" }));
      return;
    }
    try {
      const updated = equipmentStore.update(targetId, body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, equipment: updated }));
    } catch (err: any) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  res.writeHead(405, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ success: false, error: "Method not allowed" }));
}
