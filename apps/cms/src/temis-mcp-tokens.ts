import {
  Role,
  VALID_SCOPES,
  clampScopes,
  generatePrefixedToken,
  hasScope,
  type ApiTokenScope,
  type RoleLevel,
} from "@emdash-cms/auth";

type QueryableDb = {
  selectFrom(table: string): any;
  insertInto(table: string): any;
  deleteFrom(table: string): any;
};

type TokenLocals = {
  emdash?: {
    db?: unknown;
  };
  tokenScopes?: string[];
  user?: {
    id?: unknown;
    role?: unknown;
  };
};

type ApiTokenRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: string;
  user_id: string;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
};

type TokenScopeCheck =
  | { ok: true; scopes: ApiTokenScope[] }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      details?: unknown;
    };

type AuthenticatedContext = {
  db: QueryableDb;
  tokenScopes?: string[];
  user: {
    id: string;
    role: RoleLevel;
  };
};

type AuthenticatedContextResult =
  | { ok: true; context: AuthenticatedContext }
  | { ok: false; response: Response };

const DEFAULT_MCP_SCOPES = [
  "content:read",
  "content:write",
  "media:read",
  "media:write",
  "schema:read",
] satisfies ApiTokenScope[];

const validScopeSet = new Set<string>(VALID_SCOPES);

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
    status,
  });
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return jsonResponse(
    {
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
      },
      success: false,
    },
    status,
  );
}

function isRoleLevel(role: unknown): role is RoleLevel {
  return typeof role === "number";
}

function authenticatedContext(rawLocals: unknown): AuthenticatedContextResult {
  const locals = rawLocals as TokenLocals;
  const db = locals.emdash?.db;
  const user = locals.user;

  if (!db) {
    return {
      ok: false,
      response: errorResponse(
        500,
        "NOT_CONFIGURED",
        "EmDash database is not initialized.",
      ),
    };
  }

  if (!user || typeof user.id !== "string" || !isRoleLevel(user.role)) {
    return {
      ok: false,
      response: errorResponse(401, "UNAUTHORIZED", "Authentication required."),
    };
  }

  if (user.role < Role.EDITOR) {
    return {
      ok: false,
      response: errorResponse(
        403,
        "FORBIDDEN",
        "TEMIS MCP token management requires an editor or admin user.",
      ),
    };
  }

  return {
    context: {
      db: db as QueryableDb,
      tokenScopes: locals.tokenScopes,
      user: {
        id: user.id,
        role: user.role,
      },
    },
    ok: true,
  };
}

function parseScopes(input: unknown): TokenScopeCheck {
  const scopes = input === undefined ? DEFAULT_MCP_SCOPES : input;

  if (!Array.isArray(scopes) || scopes.length === 0) {
    return {
      code: "INVALID_SCOPES",
      message: "scopes must be a non-empty array.",
      ok: false,
      status: 400,
    };
  }

  if (!scopes.every((scope) => typeof scope === "string")) {
    return {
      code: "INVALID_SCOPES",
      message: "Every scope must be a string.",
      ok: false,
      status: 400,
    };
  }

  const invalid = scopes.filter((scope) => !validScopeSet.has(scope));
  if (invalid.length > 0) {
    return {
      code: "INVALID_SCOPES",
      details: { invalid, valid: [...VALID_SCOPES] },
      message: "One or more requested scopes are not valid EmDash scopes.",
      ok: false,
      status: 400,
    };
  }

  return { ok: true, scopes: [...new Set(scopes)] as ApiTokenScope[] };
}

function checkCallerTokenScopes(
  requestedScopes: ApiTokenScope[],
  tokenScopes: string[] | undefined,
): TokenScopeCheck {
  if (!tokenScopes) return { ok: true, scopes: requestedScopes };

  const denied = requestedScopes.filter(
    (scope) => !hasScope(tokenScopes, scope),
  );
  if (denied.length > 0) {
    return {
      code: "INSUFFICIENT_SCOPE",
      details: { denied },
      message:
        "Current bearer token cannot create a token with the requested scopes.",
      ok: false,
      status: 403,
    };
  }

  return { ok: true, scopes: requestedScopes };
}

function checkRoleScopes(
  requestedScopes: ApiTokenScope[],
  role: RoleLevel,
): TokenScopeCheck {
  const granted = clampScopes(requestedScopes, role);
  const denied = requestedScopes.filter((scope) => !granted.includes(scope));

  if (denied.length > 0) {
    return {
      code: "FORBIDDEN_SCOPES",
      details: { denied, granted },
      message:
        "Current user role cannot create a token with the requested scopes.",
      ok: false,
      status: 403,
    };
  }

  return { ok: true, scopes: granted as ApiTokenScope[] };
}

function rowToTokenInfo(row: ApiTokenRow) {
  return {
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    id: row.id,
    lastUsedAt: row.last_used_at,
    name: row.name,
    prefix: row.prefix,
    scopes: JSON.parse(row.scopes) as string[],
    userId: row.user_id,
  };
}

export async function listCurrentUserTokens(
  locals: unknown,
): Promise<Response> {
  const auth = authenticatedContext(locals);
  if (!auth.ok) return auth.response;
  const { context } = auth;

  const rows = (await context.db
    .selectFrom("_emdash_api_tokens")
    .select([
      "id",
      "name",
      "prefix",
      "scopes",
      "user_id",
      "expires_at",
      "last_used_at",
      "created_at",
    ])
    .where("user_id", "=", context.user.id)
    .orderBy("created_at", "desc")
    .execute()) as ApiTokenRow[];

  return jsonResponse({
    data: { items: rows.map(rowToTokenInfo) },
    success: true,
  });
}

export async function createCurrentUserToken(
  locals: unknown,
  input: unknown,
): Promise<Response> {
  const auth = authenticatedContext(locals);
  if (!auth.ok) return auth.response;
  const { context } = auth;

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return errorResponse(
      400,
      "INVALID_BODY",
      "Request body must be a JSON object.",
    );
  }

  const body = input as Record<string, unknown>;
  const name = body.name;
  const expiresAt = body.expiresAt;

  if (
    typeof name !== "string" ||
    name.trim().length === 0 ||
    name.length > 100
  ) {
    return errorResponse(
      400,
      "INVALID_NAME",
      "name must be a non-empty string no longer than 100 characters.",
    );
  }

  if (
    expiresAt !== undefined &&
    (typeof expiresAt !== "string" || Number.isNaN(Date.parse(expiresAt)))
  ) {
    return errorResponse(
      400,
      "INVALID_EXPIRY",
      "expiresAt must be an ISO 8601 datetime.",
    );
  }

  const parsed = parseScopes(body.scopes);
  if (!parsed.ok) {
    return errorResponse(
      parsed.status,
      parsed.code,
      parsed.message,
      parsed.details,
    );
  }

  const tokenScopeCheck = checkCallerTokenScopes(
    parsed.scopes,
    context.tokenScopes,
  );
  if (!tokenScopeCheck.ok) {
    return errorResponse(
      tokenScopeCheck.status,
      tokenScopeCheck.code,
      tokenScopeCheck.message,
      tokenScopeCheck.details,
    );
  }

  const roleScopeCheck = checkRoleScopes(
    tokenScopeCheck.scopes,
    context.user.role,
  );
  if (!roleScopeCheck.ok) {
    return errorResponse(
      roleScopeCheck.status,
      roleScopeCheck.code,
      roleScopeCheck.message,
      roleScopeCheck.details,
    );
  }

  const id = crypto.randomUUID();
  const { raw, hash, prefix } = generatePrefixedToken("ec_pat_");
  const createdAt = new Date().toISOString();

  await context.db
    .insertInto("_emdash_api_tokens")
    .values({
      created_at: createdAt,
      expires_at: expiresAt ?? null,
      id,
      last_used_at: null,
      name: name.trim(),
      prefix,
      scopes: JSON.stringify(roleScopeCheck.scopes),
      token_hash: hash,
      user_id: context.user.id,
    })
    .execute();

  return jsonResponse(
    {
      data: {
        info: {
          createdAt,
          expiresAt: expiresAt ?? null,
          id,
          lastUsedAt: null,
          name: name.trim(),
          prefix,
          scopes: roleScopeCheck.scopes,
          userId: context.user.id,
        },
        token: raw,
      },
      success: true,
    },
    201,
  );
}

export async function revokeCurrentUserToken(
  locals: unknown,
  tokenId: string | undefined,
): Promise<Response> {
  const auth = authenticatedContext(locals);
  if (!auth.ok) return auth.response;
  const { context } = auth;

  if (!tokenId) {
    return errorResponse(400, "INVALID_TOKEN_ID", "Token ID is required.");
  }

  const result = await context.db
    .deleteFrom("_emdash_api_tokens")
    .where("id", "=", tokenId)
    .where("user_id", "=", context.user.id)
    .executeTakeFirst();

  if (result.numDeletedRows === 0n) {
    return errorResponse(404, "NOT_FOUND", "Token not found.");
  }

  return jsonResponse({ data: { revoked: true }, success: true });
}
