/**
 * Decodes a JWT payload without verifying the signature. This is only used
 * client-side to read `role`/`user_id` for routing/display convenience -
 * the backend independently verifies the token signature on every request,
 * so a tampered token simply gets rejected by the API, not "trusted" here.
 */
export function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}
