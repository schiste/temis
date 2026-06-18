import type { APIRoute } from "astro";

import { revokeCurrentUserToken } from "../../../../../temis-mcp-tokens";

export const prerender = false;

export const DELETE: APIRoute = async ({ params, locals }) => {
  return revokeCurrentUserToken(locals, params.id);
};
