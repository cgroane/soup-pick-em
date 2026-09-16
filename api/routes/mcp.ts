import express from "express";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { requireAuth } from "../middlware";
import { McpAuthenticatedRequest, originFromFetchRequest, requireMcpAuth } from "../mcp/auth";
import { buildMcpServer } from "../mcp/server";
import { oauthRouter } from "../mcp/oauth";
import { listTokens, mintToken, normalizeScopes, revokeTokenByHash } from "../mcp/tokenStore";

const mcpRouter = express.Router();

const tokensRouter = express.Router();
tokensRouter.use(requireAuth);

tokensRouter.post("/", async (req: express.Request, res: express.Response) => {
  const uid = (req as express.Request & { user?: { uid: string } }).user!.uid;
  const { name, scopes } = req.body as { name?: string; scopes?: string[] };
  try {
    const { token, record } = await mintToken({
      uid,
      kind: "pat",
      clientId: name?.trim() || "Personal access token",
      scopes: normalizeScopes(scopes),
    });
    return res.status(201).json({ token, ...record });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

tokensRouter.get("/", async (req: express.Request, res: express.Response) => {
  const uid = (req as express.Request & { user?: { uid: string } }).user!.uid;
  try {
    return res.json(await listTokens(uid));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

tokensRouter.delete("/:tokenHash", async (req: express.Request, res: express.Response) => {
  const uid = (req as express.Request & { user?: { uid: string } }).user!.uid;
  try {
    const ok = await revokeTokenByHash(uid, req.params.tokenHash);
    return ok ? res.status(204).send() : res.status(404).json({ message: "Not found" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

mcpRouter.use("/tokens", tokensRouter);
mcpRouter.use("/oauth", oauthRouter);

const handler = createMcpHandler(
  (ctx) => {
    const extra = ctx.authInfo?.extra as { uid?: string } | undefined;
    if (!extra?.uid) throw new Error("MCP request reached the factory without an authenticated uid");
    return buildMcpServer(
      extra.uid,
      (ctx.authInfo?.scopes ?? ["read"]) as ("read" | "write")[],
      originFromFetchRequest(ctx.requestInfo)
    );
  },
  { onerror: (err) => console.error("[mcp]", err) }
);

const nodeHandler = toNodeHandler(handler, {
  onerror: (err) => console.error("[mcp:transport]", err),
});

mcpRouter.use(requireMcpAuth);

mcpRouter.all("/", (req: McpAuthenticatedRequest, res: express.Response) =>
  nodeHandler(req as never, res as never, req.body)
);

export default mcpRouter;
