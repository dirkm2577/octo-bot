/**
 * connect-gmail Edge Function
 * Per spec: docs/specs/gmail-oauth-edge-functions.md (Section 3.1)
 *
 * Purpose: Generate and return the Google OAuth authorization URL for the authenticated user.
 *
 * Request: GET /functions/v1/connect-gmail
 * Auth: Required — Supabase JWT in Authorization: Bearer <token>
 *
 * Responses:
 * - 200: { url: string } — Google OAuth authorization URL
 * - 401: { error: "unauthorized", message: "..." }
 * - 409: { error: "already_connected", message: "...", gmail_email: "..." }
 * - 500: { error: "internal_error", message: "..." }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createSignedState } from '../_shared/oauth-state.ts';

// Google OAuth configuration
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Only allow GET requests
  if (req.method !== 'GET') {
    return errorResponse('method_not_allowed', 'Only GET requests are allowed.', 405);
  }

  try {
    // Validate required environment variables
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleRedirectUri = Deno.env.get('GOOGLE_REDIRECT_URI');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!googleClientId || !googleRedirectUri) {
      console.error('Missing required environment variables: GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI');
      return errorResponse(
        'internal_error',
        'Failed to generate authorization URL. Please try again.',
        500
      );
    }

    // Extract and validate Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('unauthorized', 'Valid authentication required.', 401);
    }

    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with user's JWT
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });

    // Get user from JWT
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.warn('JWT validation failed:', userError?.message);
      return errorResponse('unauthorized', 'Valid authentication required.', 401);
    }

    const userId = user.id;
    console.info(`Flow initiated for user_id: ${userId}`);

    // Check if user already has Gmail connected
    const { data: existingToken, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('gmail_email')
      .eq('user_id', userId)
      .maybeSingle();

    if (tokenError) {
      console.error('Database query error:', tokenError.message);
      return errorResponse(
        'internal_error',
        'Failed to generate authorization URL. Please try again.',
        500
      );
    }

    if (existingToken) {
      console.info(`User ${userId} already connected to: ${existingToken.gmail_email}`);
      return errorResponse(
        'already_connected',
        'A Gmail account is already connected. Disconnect it first.',
        409,
        { gmail_email: existingToken.gmail_email }
      );
    }

    // Generate signed state parameter
    let state: string;
    try {
      state = await createSignedState(userId);
      console.debug(`State generated for user_id: ${userId}`);
    } catch (stateError) {
      console.error('State generation failed:', stateError);
      return errorResponse(
        'internal_error',
        'Failed to generate authorization URL. Please try again.',
        500
      );
    }

    // Build Google OAuth URL
    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: googleRedirectUri,
      response_type: 'code',
      scope: GMAIL_READONLY_SCOPE,
      access_type: 'offline', // Required to get refresh_token
      prompt: 'consent', // Force consent to guarantee refresh_token
      state: state,
    });

    const url = `${GOOGLE_AUTH_URL}?${params.toString()}`;

    console.info(`OAuth URL generated for user_id: ${userId}`);
    return jsonResponse({ url });
  } catch (error) {
    console.error('Unexpected error in connect-gmail:', error);
    return errorResponse(
      'internal_error',
      'Failed to generate authorization URL. Please try again.',
      500
    );
  }
});
