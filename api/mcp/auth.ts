import { NextFunction, Request, Response } from "express";
import { McpScope, McpTokenRecord, verifyToken } from "./tokenStore";


export type McpAuthInfo = {
  token: string;
  clientId: string;
  scopes: string[];
  expiresAt?: number;
  extra?: Record<string, unknown>;
};

// forwarding auth
export interface McpAuthenticatedRequest extends Request {
  auth?: McpAuthInfo;
  mcpToken?: McpTokenRecord;
}


export const publicBaseUrl = (req: Request): string => {
  const configured = process.env.PUBLIC_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const proto = (req.headers["x-forwarded-proto"] as string)?.split(",")[0] ?? req.protocol;
  const host = (req.headers["x-forwarded-host"] as string)?.split(",")[0] ?? req.get("host");
  return `${proto}://${host}`;
};

export const resourceIdentifier = (req: Request): string => `${publicBaseUrl(req)}/api/mcp`;

export const originFromFetchRequest = (request?: globalThis.Request): string | undefined => {
  const configured = process.env.PUBLIC_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (!request) return undefined;
  const parsed = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0] ?? parsed.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host")?.split(",")[0] ?? request.headers.get("host") ?? parsed.host;
  return `${proto}://${host}`;
};

const challenge = (req: Request, res: Response, error: string, description: string) => {
  const metadata = `${publicBaseUrl(req)}/.well-known/oauth-protected-resource`;
  res.setHeader(
    "WWW-Authenticate",
    `Bearer realm="soup-pick-em", error="${error}", error_description="${description}", resource_metadata="${metadata}"`
  );
  return res.status(401).json({ error, error_description: description });
};

export const requireMcpAuth = async (
  req: McpAuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const header = req.headers.authorization;
  if (!header?.toLowerCase().startsWith("bearer ")) {
    return challenge(req, res, "invalid_request", "Missing bearer token");
  }

  const token = header.slice(7).trim();
  const record = await verifyToken(token);
  if (!record) {
    return challenge(req, res, "invalid_token", "Token is unknown, revoked, or expired");
  }

  req.mcpToken = record;
  req.auth = {
    token,
    clientId: record.clientId,
    scopes: record.scopes,
    ...(record.expiresAt ? { expiresAt: Math.floor(Date.parse(record.expiresAt) / 1000) } : {}),
    extra: { uid: record.uid, kind: record.kind },
  };
  next();
  return;
};

export const requireMcpScope =
  (scope: McpScope) => (req: McpAuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.mcpToken) {
      return challenge(req, res, "invalid_token", "Not authenticated");
    }
    if (!req.mcpToken.scopes.includes(scope)) {
      res.setHeader(
        "WWW-Authenticate",
        `Bearer realm="soup-pick-em", error="insufficient_scope", scope="${scope}"`
      );
      return res.status(403).json({ error: "insufficient_scope", required: scope });
    }
    next();
    return;
  };
