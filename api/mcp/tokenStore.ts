import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";

export const MCP_TOKENS = "mcpTokens";

export type McpScope = "read" | "write";
export const ALL_SCOPES: McpScope[] = ["read", "write"];

export type McpTokenKind = "pat" | "oauth";

export type McpTokenRecord = {
  uid: string;
  kind: McpTokenKind;
  clientId: string;
  scopes: McpScope[];
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
  revoked?: boolean;
};

const PREFIX: Record<McpTokenKind, string> = {
  pat: "spe_pat_",
  oauth: "spe_at_",
};

export const hashToken = (token: string): string =>
  createHash("sha256").update(token, "utf8").digest("hex");

export const normalizeScopes = (requested: readonly string[] | undefined): McpScope[] => {
  const seen = new Set<string>();
  const out: McpScope[] = [];
  for (const s of requested ?? []) {
    if ((ALL_SCOPES as string[]).includes(s) && !seen.has(s)) {
      seen.add(s);
      out.push(s as McpScope);
    }
  }
  return out.length ? out : ["read"];
};

/**
 * Mints a token and persists only its digest. 
 */
export const mintToken = async (params: {
  uid: string;
  kind: McpTokenKind;
  clientId: string;
  scopes: McpScope[];
  ttlSeconds?: number;
}): Promise<{ token: string; record: McpTokenRecord }> => {
  const token = PREFIX[params.kind] + randomBytes(32).toString("base64url");
  const record: McpTokenRecord = {
    uid: params.uid,
    kind: params.kind,
    clientId: params.clientId,
    scopes: params.scopes,
    createdAt: new Date().toISOString(),
    ...(params.ttlSeconds
      ? { expiresAt: new Date(Date.now() + params.ttlSeconds * 1000).toISOString() }
      : {}),
  };
  await getFirestore().collection(MCP_TOKENS).doc(hashToken(token)).set(record);
  return { token, record };
};

/**
 * Resolves a presented token to its record, or `undefined` when it is unknown,
 * revoked, or expired. `lastUsedAt` is refreshed opportunistically bc a failed
 * write can't fail the request, since it is telemetry, not authorization.
 */
export const verifyToken = async (token: string): Promise<McpTokenRecord | undefined> => {
  if (!token) return undefined;
  const ref = getFirestore().collection(MCP_TOKENS).doc(hashToken(token));
  const snap = await ref.get();
  if (!snap.exists) return undefined;

  const record = snap.data() as McpTokenRecord;
  if (record.revoked) return undefined;
  if (record.expiresAt && Date.parse(record.expiresAt) <= Date.now()) return undefined;

  void ref.update({ lastUsedAt: new Date().toISOString() }).catch(() => undefined);
  return record;
};

export const revokeTokenByHash = async (uid: string, tokenHash: string): Promise<boolean> => {
  const ref = getFirestore().collection(MCP_TOKENS).doc(tokenHash);
  const snap = await ref.get();
  if (!snap.exists || (snap.data() as McpTokenRecord).uid !== uid) return false;
  await ref.update({ revoked: true });
  return true;
};

export const listTokens = async (
  uid: string
): Promise<Array<McpTokenRecord & { tokenHash: string }>> => {
  const snap = await getFirestore().collection(MCP_TOKENS).where("uid", "==", uid).get();
  return snap.docs
    .map((d) => ({ tokenHash: d.id, ...(d.data() as McpTokenRecord) }))
    .filter((t) => !t.revoked);
};

export const safeEqual = (a: string, b: string): boolean => {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
};
