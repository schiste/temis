import type { APIRoute } from "astro";

import {
  createCurrentUserToken,
  listCurrentUserTokens,
  errorResponse,
} from "../../../../../temis-mcp-tokens";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  return listCurrentUserTokens(locals);
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    return createCurrentUserToken(locals, await request.json());
  } catch {
    return errorResponse(
      400,
      "INVALID_JSON",
      "Request body must be valid JSON.",
    );
  }
};
