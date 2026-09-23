/**
 * OAuth 2.1 Authorization Server for the MCP connector.
 *
 * Perplexity's iOS client (and Claude's mobile clients) follow the MCP
 * authorization spec strictly: they will not accept a static bearer
 * token, they will only speak OAuth 2.1 with Dynamic Client
 * Registration (RFC 7591) and PKCE (RFC 7636). This module makes the
 * connector satisfy that spec.
 *
 * Design:
 *  - In-memory stores for clients, authorization codes, and access
 *    tokens. Suitable for a single-instance Railway deployment. For
 *    multi-node horizontal scaling, swap these for a Postgres table.
 *  - The user-facing consent step is a bearer-token gate: the user
 *    pastes MCP_BEARER_TOKEN on the consent page. That token is the
 *    same one that used to gate the endpoint directly; it now proves
 *    the user is authorized to grant the OAuth client access. This
 *    keeps the personal-use posture (one operator, one secret) while
 *    exposing a compliant OAuth surface to MCP clients.
 *  - Access tokens are opaque random strings with a 1-hour TTL and no
 *    refresh (yet). Refresh tokens are a follow-up.
 *  - No password store, no user accounts. The AuthInfo returned by
 *    verifyAccessToken uses a fixed synthetic user id.
 */
import { randomBytes, timingSafeEqual } from "crypto";
import type { Response } from "express";
import type {
  OAuthServerProvider,
  AuthorizationParams,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type {
  OAuthClientInformationFull,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
  InvalidTokenError,
  InvalidGrantError,
  UnsupportedGrantTypeError,
} from "@modelcontextprotocol/sdk/server/auth/errors.js";
import logger from "../utils/logger";

// -- helpers ---------------------------------------------------------
function generateId(prefix: string, bytes = 24): string {
  return `${prefix}_${randomBytes(bytes).toString("base64url")}`;
}

/**
 * Constant-time compare. Both arguments must be strings; returns false
 * if either is missing or lengths differ.
 */
function safeEqual(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// -- in-memory stores ------------------------------------------------
interface StoredAuthCode {
  code: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scopes: string[];
  resource?: string;
  createdAt: number;
  used: boolean;
}

interface StoredAccessToken {
  token: string;
  clientId: string;
  scopes: string[];
  resource?: string;
  createdAt: number;
  expiresAt: number;
}

const clients = new Map<string, OAuthClientInformationFull>();
const authCodes = new Map<string, StoredAuthCode>();
const accessTokens = new Map<string, StoredAccessToken>();

const AUTH_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const ACCESS_TOKEN_TTL_S = 60 * 60; // 1 hour

// Periodic cleanup of expired records. Cheap because everything is
// in-memory and small.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of authCodes) {
    if (v.used || now - v.createdAt > AUTH_CODE_TTL_MS) authCodes.delete(k);
  }
  for (const [k, v] of accessTokens) {
    if (now > v.expiresAt * 1000) accessTokens.delete(k);
  }
}, 5 * 60 * 1000).unref();

// -- clients store ---------------------------------------------------
/**
 * Store used by the SDK's dynamic client registration handler. We
 * accept any redirect URI the client asks for — MCP clients drive
 * their own redirect scheme (perplexity://oauth-callback, http://
 * localhost:PORT/callback, etc.) so we can't preauthorize them.
 */
class InMemoryClientsStore implements OAuthRegisteredClientsStore {
  async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    return clients.get(clientId);
  }

  async registerClient(
    client: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">
  ): Promise<OAuthClientInformationFull> {
    const clientId = generateId("mcp-client");
    const now = Math.floor(Date.now() / 1000);
    const full: OAuthClientInformationFull = {
      ...client,
      client_id: clientId,
      client_id_issued_at: now,
    };
    clients.set(clientId, full);
    logger.info("Registered MCP OAuth client", {
      clientId,
      redirectUris: full.redirect_uris,
      name: full.client_name,
    });
    return full;
  }
}

// -- provider --------------------------------------------------------
export class ActivityPlannerOAuthProvider implements OAuthServerProvider {
  public readonly clientsStore: OAuthRegisteredClientsStore = new InMemoryClientsStore();
  private readonly consentBearer: string;

  constructor(consentBearer: string) {
    this.consentBearer = consentBearer;
  }

  /**
   * Called after the SDK's authorize handler validates the request and
   * loads the client. We hand the user a consent page; when they paste
   * the correct MCP_BEARER_TOKEN, the page POSTs back to
   * /oauth/complete-authorize and we issue an authorization code.
   *
   * This method never actually redirects on its own — it renders the
   * consent page. The subsequent POST calls issueAuthorizationCode
   * which performs the redirect.
   */
  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response
  ): Promise<void> {
    // Stash the parameters in a signed state token so the POST-back
    // can't be tampered with. For simplicity here we use a random id
    // keyed to the in-memory pending map; a follow-up should HMAC this.
    const pendingId = generateId("pending", 16);
    pendingAuthorizations.set(pendingId, {
      clientId: client.client_id,
      redirectUri: params.redirectUri,
      codeChallenge: params.codeChallenge,
      // The SDK's AuthorizationParams doesn't expose codeChallengeMethod
      // separately; per OAuth 2.1 the only allowed value is S256, which
      // the SDK's authorize handler already enforces upstream.
      codeChallengeMethod: "S256",
      scopes: params.scopes ?? [],
      state: params.state,
      resource: params.resource?.toString(),
      createdAt: Date.now(),
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(renderConsentPage({
      clientName: client.client_name ?? client.client_id,
      pendingId,
    }));
  }

  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<string> {
    const record = authCodes.get(authorizationCode);
    if (!record) throw new InvalidGrantError("authorization code not found");
    if (record.used) throw new InvalidGrantError("authorization code already used");
    if (Date.now() - record.createdAt > AUTH_CODE_TTL_MS) {
      throw new InvalidGrantError("authorization code expired");
    }
    // Burn the code on lookup. The SDK's token handler always looks up
    // the challenge before calling exchangeAuthorizationCode, so this
    // guarantees single-use even if the PKCE verifier is wrong. Codes
    // are therefore unrecoverable after one attempt — which is exactly
    // what OAuth 2.1 (RFC 9700 §2.1.1) requires.
    record.used = true;
    return record.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    redirectUri?: string,
    resource?: URL
  ): Promise<OAuthTokens> {
    const record = authCodes.get(authorizationCode);
    // Note: record.used will already be true here because
    // challengeForAuthorizationCode ran first and burned the code.
    // We rely on that: the only way to reach this method is via that
    // successful lookup.
    if (!record) throw new InvalidGrantError("authorization code not found");
    if (record.clientId !== client.client_id) {
      throw new InvalidGrantError("client mismatch");
    }
    if (redirectUri && redirectUri !== record.redirectUri) {
      throw new InvalidGrantError("redirect_uri mismatch");
    }
    // The SDK's token handler validates the PKCE code_verifier against
    // the challenge returned by challengeForAuthorizationCode above, so
    // we don't need to redo that here.

    const token = generateId("mcp-tok", 32);
    const now = Math.floor(Date.now() / 1000);
    const stored: StoredAccessToken = {
      token,
      clientId: client.client_id,
      scopes: record.scopes,
      resource: resource?.toString() ?? record.resource,
      createdAt: now,
      expiresAt: now + ACCESS_TOKEN_TTL_S,
    };
    accessTokens.set(token, stored);
    logger.info("Issued MCP OAuth access token", {
      clientId: client.client_id,
      tokenPrefix: token.slice(0, 12) + "...",
      expiresInSeconds: ACCESS_TOKEN_TTL_S,
    });

    return {
      access_token: token,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_S,
      scope: record.scopes.join(" ") || undefined,
    };
  }

  async exchangeRefreshToken(): Promise<OAuthTokens> {
    // Refresh tokens are a follow-up. Clients that need long-lived
    // access can re-authorize; 1 hour is plenty for interactive use.
    throw new UnsupportedGrantTypeError("refresh tokens not implemented");
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const record = accessTokens.get(token);
    if (!record) throw new InvalidTokenError("unknown access token");
    if (Date.now() > record.expiresAt * 1000) {
      accessTokens.delete(token);
      throw new InvalidTokenError("access token expired");
    }
    return {
      token,
      clientId: record.clientId,
      scopes: record.scopes,
      expiresAt: record.expiresAt,
      resource: record.resource ? new URL(record.resource) : undefined,
    };
  }

  /**
   * Called from POST /oauth/complete-authorize once the user has
   * pasted a valid consent bearer. Issues the authorization code and
   * redirects the user back to the client's redirect URI.
   */
  completeAuthorization(pendingId: string, consentToken: string, res: Response): void {
    const pending = pendingAuthorizations.get(pendingId);
    if (!pending) {
      res.status(400).type("html").send(
        renderErrorPage("This authorization request is missing or expired. Please start again from your MCP client.")
      );
      return;
    }
    if (Date.now() - pending.createdAt > AUTH_CODE_TTL_MS) {
      pendingAuthorizations.delete(pendingId);
      res.status(400).type("html").send(
        renderErrorPage("Authorization request expired. Please start again from your MCP client.")
      );
      return;
    }
    if (!safeEqual(consentToken, this.consentBearer)) {
      // Don't burn the pending record — let the user retry.
      res.status(401).type("html").send(
        renderConsentPage({
          clientName: clients.get(pending.clientId)?.client_name ?? pending.clientId,
          pendingId,
          error: "That token didn't match. Try again.",
        })
      );
      return;
    }

    pendingAuthorizations.delete(pendingId);
    const code = generateId("mcp-code", 32);
    authCodes.set(code, {
      code,
      clientId: pending.clientId,
      redirectUri: pending.redirectUri,
      codeChallenge: pending.codeChallenge,
      codeChallengeMethod: pending.codeChallengeMethod,
      scopes: pending.scopes,
      resource: pending.resource,
      createdAt: Date.now(),
      used: false,
    });

    const url = new URL(pending.redirectUri);
    url.searchParams.set("code", code);
    if (pending.state) url.searchParams.set("state", pending.state);
    logger.info("MCP OAuth consent granted", {
      clientId: pending.clientId,
      redirectUri: pending.redirectUri,
    });
    res.redirect(302, url.toString());
  }
}

// -- pending authorizations (between GET /authorize and POST /complete-authorize)
interface PendingAuthorization {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scopes: string[];
  state?: string;
  resource?: string;
  createdAt: number;
}
const pendingAuthorizations = new Map<string, PendingAuthorization>();

// -- consent page HTML -----------------------------------------------
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderConsentPage(opts: {
  clientName: string;
  pendingId: string;
  error?: string;
}): string {
  const err = opts.error
    ? `<p class="error" role="alert">${escapeHtml(opts.error)}</p>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Authorize Activity Planner MCP</title>
<style>
  :root { color-scheme: light dark; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    max-width: 480px; margin: 0 auto; padding: 40px 20px;
    line-height: 1.5;
  }
  h1 { font-size: 20px; margin-bottom: 8px; }
  .client { font-weight: 600; }
  .subtitle { color: #666; margin-top: 0; font-size: 14px; }
  form { margin-top: 24px; display: flex; flex-direction: column; gap: 12px; }
  label { font-size: 14px; font-weight: 500; }
  input[type="password"] {
    padding: 10px 12px; font-size: 15px; border: 1px solid #ccc;
    border-radius: 8px; font-family: ui-monospace, monospace;
  }
  button {
    padding: 12px; background: #111; color: white; border: none;
    border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer;
  }
  button:hover { background: #333; }
  .error { color: #b91c1c; font-size: 14px; }
  .hint { color: #888; font-size: 13px; }
  @media (prefers-color-scheme: dark) {
    body { background: #0b0b0b; color: #eee; }
    .subtitle, .hint { color: #999; }
    input[type="password"] { background: #1a1a1a; color: #eee; border-color: #333; }
    button { background: #eee; color: #111; }
    button:hover { background: #fff; }
    .error { color: #f87171; }
  }
</style>
</head>
<body>
<h1>Authorize <span class="client">${escapeHtml(opts.clientName)}</span></h1>
<p class="subtitle">This MCP client is requesting access to your Activity Planner data (events, alert rules, scrape controls).</p>
${err}
<form method="POST" action="/oauth/complete-authorize">
  <input type="hidden" name="pending_id" value="${escapeHtml(opts.pendingId)}">
  <label for="consent_token">Consent token</label>
  <input type="password" id="consent_token" name="consent_token" autocomplete="off" required autofocus>
  <p class="hint">Paste the <code>MCP_BEARER_TOKEN</code> configured on your Railway deployment. This proves you're the operator and authorizes the MCP client.</p>
  <button type="submit">Approve access</button>
</form>
</body>
</html>`;
}

function renderErrorPage(message: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Authorization error</title>
<style>body{font-family:sans-serif;max-width:480px;margin:40px auto;padding:0 20px}</style>
</head><body><h1>Authorization error</h1><p>${escapeHtml(message)}</p></body></html>`;
}
