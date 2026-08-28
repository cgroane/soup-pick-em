import express from "express";
import { createHash, randomBytes } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { hashToken, mintToken, normalizeScopes, safeEqual, McpScope } from "./tokenStore";
import { publicBaseUrl, resourceIdentifier } from "./auth";
import { consentPage } from "./consentPage";


const CLIENTS = "mcpOAuthClients";
const CODES = "mcpAuthCodes";
const REFRESH = "mcpRefreshTokens";

const ACCESS_TOKEN_TTL = 60 * 60 * 24 * 30; // 30 days
const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type OAuthClient = {
  clientId: string;
  clientName: string;
  redirectUris: string[];
  createdAt: string;
};

type AuthCode = {
  uid: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scopes: McpScope[];
  resource?: string;
  expiresAt: number;
};

const s256 = (verifier: string) =>
  createHash("sha256").update(verifier, "utf8").digest("base64url");

const redirectAllowed = (client: OAuthClient, uri: string) =>
  client.redirectUris.some((u) => u === uri);

export const oauthRouter = express.Router();

oauthRouter.post("/register", async (req: express.Request, res: express.Response) => {
  const body = req.body as {
    redirect_uris?: string[];
    client_name?: string;
  };
  const redirectUris = body?.redirect_uris;
  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    return res
      .status(400)
      .json({ error: "invalid_redirect_uri", error_description: "redirect_uris is required" });
  }
  for (const uri of redirectUris) {
    try {
      const parsed = new URL(uri);

      const isLoopback = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(parsed.hostname);
      if (parsed.protocol !== "https:" && !isLoopback && parsed.protocol !== "http:") {
        return res.status(400).json({ error: "invalid_redirect_uri" });
      }
    } catch {
      return res.status(400).json({ error: "invalid_redirect_uri" });
    }
  }

  const client: OAuthClient = {
    clientId: `spe_client_${randomBytes(16).toString("hex")}`,
    clientName: body.client_name ?? "MCP client",
    redirectUris,
    createdAt: new Date().toISOString(),
  };
  await getFirestore().collection(CLIENTS).doc(client.clientId).set(client);

  return res.status(201).json({
    client_id: client.clientId,
    client_name: client.clientName,
    redirect_uris: client.redirectUris,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    client_id_issued_at: Math.floor(Date.now() / 1000),
  });
});

oauthRouter.get("/authorize", async (req: express.Request, res: express.Response) => {
  const {
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: method,
    scope,
    resource,
    response_type: responseType,
  } = req.query as Record<string, string | undefined>;

  if (responseType !== "code") {
    return res.status(400).send("Unsupported response_type — only 'code' is supported.");
  }
  if (!clientId || !redirectUri || !codeChallenge) {
    return res.status(400).send("Missing client_id, redirect_uri, or code_challenge.");
  }
  if (method !== "S256") {
    return res.status(400).send("code_challenge_method must be S256.");
  }

  const snap = await getFirestore().collection(CLIENTS).doc(clientId).get();
  if (!snap.exists) return res.status(400).send("Unknown client_id.");
  const client = snap.data() as OAuthClient;
  if (!redirectAllowed(client, redirectUri)) {
    return res.status(400).send("redirect_uri does not match this client's registration.");
  }

  const scopes = normalizeScopes(scope?.split(/[\s+]+/));
  res.type("html").send(
    consentPage({
      clientName: client.clientName,
      params: {
        client_id: clientId,
        redirect_uri: redirectUri,
        state: state ?? "",
        code_challenge: codeChallenge,
        scope: scopes.join(" "),
        resource: resource ?? resourceIdentifier(req),
      },
      firebaseConfig: process.env.REACT_APP_FIREBASE_CONFIG ?? "{}",
    })
  );
  return;
});

oauthRouter.post("/approve", async (req: express.Request, res: express.Response) => {
  const {
    idToken,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    scope,
    resource,
  } = req.body as Record<string, string | undefined>;

  if (!idToken || !clientId || !redirectUri || !codeChallenge) {
    return res.status(400).json({ error: "invalid_request" });
  }

  let uid: string;
  try {
    uid = (await getAuth().verifyIdToken(idToken)).uid;
  } catch {
    return res.status(401).json({ error: "access_denied", error_description: "Sign-in failed" });
  }

  const snap = await getFirestore().collection(CLIENTS).doc(clientId).get();
  if (!snap.exists) return res.status(400).json({ error: "invalid_client" });
  if (!redirectAllowed(snap.data() as OAuthClient, redirectUri)) {
    return res.status(400).json({ error: "invalid_request" });
  }

  const code = randomBytes(32).toString("base64url");
  const record: AuthCode = {
    uid,
    clientId,
    redirectUri,
    codeChallenge,
    scopes: normalizeScopes(scope?.split(/[\s+]+/)),
    resource,
    expiresAt: Date.now() + CODE_TTL_MS,
  };

  await getFirestore().collection(CODES).doc(hashToken(code)).set(record);

  return res.json({ code });
});

oauthRouter.post("/token", async (req: express.Request, res: express.Response) => {
  const grantType = (req.body as Record<string, string>)?.grant_type;
  if (grantType === "authorization_code") return exchangeCode(req, res);
  if (grantType === "refresh_token") return refreshGrant(req, res);
  return res.status(400).json({ error: "unsupported_grant_type" });
});

async function exchangeCode(req: express.Request, res: express.Response) {
  const {
    code,
    code_verifier: verifier,
    client_id: clientId,
    redirect_uri: redirectUri,
  } = req.body as Record<string, string | undefined>;

  if (!code || !verifier || !clientId) {
    return res.status(400).json({ error: "invalid_request" });
  }

  const db = getFirestore();
  const ref = db.collection(CODES).doc(hashToken(code));
  const snap = await ref.get();
  if (!snap.exists) return res.status(400).json({ error: "invalid_grant" });

  await ref.delete();

  const record = snap.data() as AuthCode;
  if (record.expiresAt <= Date.now()) return res.status(400).json({ error: "invalid_grant" });
  if (record.clientId !== clientId) return res.status(400).json({ error: "invalid_grant" });
  if (redirectUri && record.redirectUri !== redirectUri) {
    return res.status(400).json({ error: "invalid_grant" });
  }
  if (!safeEqual(s256(verifier), record.codeChallenge)) {
    return res.status(400).json({ error: "invalid_grant", error_description: "PKCE check failed" });
  }

  return res.json(await issueTokens(record.uid, clientId, record.scopes));
}

async function refreshGrant(req: express.Request, res: express.Response) {
  const { refresh_token: refreshToken, client_id: clientId } = req.body as Record<
    string,
    string | undefined
  >;
  if (!refreshToken || !clientId) return res.status(400).json({ error: "invalid_request" });

  const db = getFirestore();
  const ref = db.collection(REFRESH).doc(hashToken(refreshToken));
  const snap = await ref.get();
  if (!snap.exists) return res.status(400).json({ error: "invalid_grant" });

  const record = snap.data() as { uid: string; clientId: string; scopes: McpScope[] };
  if (record.clientId !== clientId) return res.status(400).json({ error: "invalid_grant" });

  await ref.delete();
  return res.json(await issueTokens(record.uid, clientId, record.scopes));
}

async function issueTokens(uid: string, clientId: string, scopes: McpScope[]) {
  const { token: accessToken } = await mintToken({
    uid,
    kind: "oauth",
    clientId,
    scopes,
    ttlSeconds: ACCESS_TOKEN_TTL,
  });
  const refreshToken = `spe_rt_${randomBytes(32).toString("base64url")}`;
  await getFirestore()
    .collection(REFRESH)
    .doc(hashToken(refreshToken))
    .set({ uid, clientId, scopes, createdAt: new Date().toISOString() });

  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL,
    refresh_token: refreshToken,
    scope: scopes.join(" "),
  };
}

export const wellKnownRouter = express.Router();

wellKnownRouter.get(
  "/.well-known/oauth-protected-resource",
  (req: express.Request, res: express.Response) => {
    const base = publicBaseUrl(req);
    res.json({
      resource: resourceIdentifier(req),
      authorization_servers: [base],
      scopes_supported: ["read", "write"],
      bearer_methods_supported: ["header"],
    });
  }
);

wellKnownRouter.get(
  "/.well-known/oauth-protected-resource/api/mcp",
  (req: express.Request, res: express.Response) => {
    const base = publicBaseUrl(req);
    res.json({
      resource: resourceIdentifier(req),
      authorization_servers: [base],
      scopes_supported: ["read", "write"],
      bearer_methods_supported: ["header"],
    });
  }
);

const authServerMetadata = (req: express.Request) => {
  const base = publicBaseUrl(req);
  return {
    issuer: base,
    authorization_endpoint: `${base}/api/mcp/oauth/authorize`,
    token_endpoint: `${base}/api/mcp/oauth/token`,
    registration_endpoint: `${base}/api/mcp/oauth/register`,
    scopes_supported: ["read", "write"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  };
};

wellKnownRouter.get(
  "/.well-known/oauth-authorization-server",
  (req: express.Request, res: express.Response) => res.json(authServerMetadata(req))
);

wellKnownRouter.get("/.well-known/openid-configuration", (req: express.Request, res: express.Response) =>
  res.json(authServerMetadata(req))
);
