import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";

/**
 * Validates that the callable request has a valid Firebase Auth context.
 * Throws HttpsError if not authenticated.
 */
export function requireAuth(request: CallableRequest): string {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }
  return request.auth.uid;
}
