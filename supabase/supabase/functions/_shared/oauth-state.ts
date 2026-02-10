/**
 * OAuth State Parameter Utilities
 * Per spec: docs/specs/gmail-oauth-edge-functions.md (Section 4)
 *
 * State format: base64url(payload) + "." + base64url(HMAC-SHA256(payload))
 * Payload: { uid: string, nonce: string, exp: number }
 * TTL: 5 minutes
 */

// State payload structure
export interface StatePayload {
  uid: string; // Supabase user_id (UUID)
  nonce: string; // 16-byte random hex string (CSRF protection)
  exp: number; // Unix timestamp — state expires 5 minutes after creation
}

// State verification error types
export type StateVerificationError =
  | 'MISSING'
  | 'MALFORMED'
  | 'SIGNATURE_INVALID'
  | 'EXPIRED';

// Custom error class for state verification failures
export class StateError extends Error {
  constructor(public readonly code: StateVerificationError) {
    super(`State verification failed: ${code}`);
    this.name = 'StateError';
  }
}

// State TTL in seconds (5 minutes per spec)
const STATE_TTL_SECONDS = 300;

/**
 * Convert a Uint8Array to base64url string
 */
function toBase64Url(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Convert a string to base64url
 */
function stringToBase64Url(str: string): string {
  const encoder = new TextEncoder();
  return toBase64Url(encoder.encode(str));
}

/**
 * Convert base64url string to Uint8Array
 */
function fromBase64Url(base64url: string): Uint8Array {
  // Add padding back
  const padded = base64url + '='.repeat((4 - (base64url.length % 4)) % 4);
  // Convert base64url to base64
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Get the HMAC key from environment
 */
async function getHmacKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('OAUTH_STATE_SECRET');
  if (!secret) {
    throw new Error('OAUTH_STATE_SECRET environment variable is not set');
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);

  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Generate a random 16-byte hex string for nonce
 */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Create a signed state parameter for OAuth flow
 *
 * @param userId - The Supabase user_id (UUID)
 * @returns The signed state string in format: base64url(payload).base64url(signature)
 */
export async function createSignedState(userId: string): Promise<string> {
  const payload: StatePayload = {
    uid: userId,
    nonce: generateNonce(),
    exp: Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS,
  };

  const payloadJson = JSON.stringify(payload);
  const payloadBase64 = stringToBase64Url(payloadJson);

  const key = await getHmacKey();
  const encoder = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payloadJson)
  );

  const signatureBase64 = toBase64Url(new Uint8Array(signatureBuffer));

  return `${payloadBase64}.${signatureBase64}`;
}

/**
 * Verify and decode a state parameter
 *
 * @param state - The state string from the OAuth callback
 * @returns The decoded payload if valid
 * @throws StateError if verification fails
 */
export async function verifyAndDecodeState(state: string): Promise<StatePayload> {
  if (!state) {
    throw new StateError('MISSING');
  }

  // Split into payload and signature
  const parts = state.split('.');
  if (parts.length !== 2) {
    throw new StateError('MALFORMED');
  }

  const [payloadBase64, signatureBase64] = parts;

  // Decode payload
  let payload: StatePayload;
  try {
    const payloadBytes = fromBase64Url(payloadBase64);
    const payloadJson = new TextDecoder().decode(payloadBytes);
    payload = JSON.parse(payloadJson);
  } catch {
    throw new StateError('MALFORMED');
  }

  // Validate payload structure
  if (
    typeof payload.uid !== 'string' ||
    typeof payload.nonce !== 'string' ||
    typeof payload.exp !== 'number'
  ) {
    throw new StateError('MALFORMED');
  }

  // Verify signature using constant-time comparison
  const key = await getHmacKey();
  const encoder = new TextEncoder();
  const payloadBytes = fromBase64Url(payloadBase64);
  const payloadJson = new TextDecoder().decode(payloadBytes);

  const expectedSignature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payloadJson)
  );

  const providedSignature = fromBase64Url(signatureBase64);

  // Constant-time comparison
  if (expectedSignature.byteLength !== providedSignature.byteLength) {
    throw new StateError('SIGNATURE_INVALID');
  }

  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    providedSignature,
    encoder.encode(payloadJson)
  );

  if (!isValid) {
    throw new StateError('SIGNATURE_INVALID');
  }

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) {
    throw new StateError('EXPIRED');
  }

  return payload;
}
