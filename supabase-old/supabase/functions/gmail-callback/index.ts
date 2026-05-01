/**
 * gmail-callback Edge Function
 * Per spec: docs/specs/gmail-oauth-edge-functions.md (Section 3.2)
 *
 * Purpose: Handle Google's OAuth redirect, exchange the authorization code for tokens,
 * store them in the database, and render a result page.
 *
 * Request: GET /functions/v1/gmail-callback?code=...&state=...
 * Auth: None (browser redirect from Google)
 *
 * Responses: HTML pages for all scenarios (not JSON)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  verifyAndDecodeState,
  StateError,
} from '../_shared/oauth-state.ts';
import {
  successPage,
  cancelledPage,
  expiredPage,
  errorPage,
  noGmailPage,
  htmlResponse,
} from '../_shared/html-templates.ts';

// Google API endpoints
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_PROFILE_URL = 'https://www.googleapis.com/gmail/v1/users/me/profile';

// Type definitions for Google API responses
interface GoogleTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GoogleTokenError {
  error: string;
  error_description: string;
}

interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

Deno.serve(async (req) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return htmlResponse(errorPage(), 400);
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const scope = url.searchParams.get('scope');

  console.info(`Callback received: code=${!!code}, error=${error || 'none'}`);

  // Step 1: Verify state parameter
  let userId: string;
  try {
    if (!state) {
      throw new StateError('MISSING');
    }
    const payload = await verifyAndDecodeState(state);
    userId = payload.uid;
    console.info(`State verified for user_id: ${userId}`);
  } catch (stateError) {
    if (stateError instanceof StateError) {
      console.warn(`State verification failed: ${stateError.code}`);
    } else {
      console.error('Unexpected state error:', stateError);
    }
    // All state failures render the same generic page (security - don't reveal cause)
    return htmlResponse(expiredPage(), 400);
  }

  // Step 2: Check if user denied permission
  if (error) {
    console.info(`User denied permission: ${error}`);
    // Return 200 for user-initiated cancellation (not an error from their perspective)
    return htmlResponse(cancelledPage(), 200);
  }

  // Step 3: Validate authorization code exists
  if (!code) {
    console.warn('No authorization code in callback');
    return htmlResponse(errorPage(), 502);
  }

  // Get environment variables
  const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const googleRedirectUri = Deno.env.get('GOOGLE_REDIRECT_URI');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (
    !googleClientId ||
    !googleClientSecret ||
    !googleRedirectUri ||
    !supabaseUrl ||
    !supabaseServiceRoleKey
  ) {
    console.error('Missing required environment variables');
    return htmlResponse(errorPage(), 502);
  }

  // Step 4: Exchange authorization code for tokens
  let tokens: GoogleTokenResponse;
  try {
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: googleRedirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = (await tokenResponse.json()) as GoogleTokenError;
      console.error(`Token exchange failed: ${errorData.error} - ${errorData.error_description}`);
      return htmlResponse(errorPage(), 502);
    }

    tokens = (await tokenResponse.json()) as GoogleTokenResponse;
    console.info(`Token exchange succeeded for user_id: ${userId}`);
  } catch (fetchError) {
    console.error('Token exchange request failed:', fetchError);
    return htmlResponse(errorPage(), 502);
  }

  // Verify refresh_token is present (should always be with prompt=consent)
  if (!tokens.refresh_token) {
    console.error('No refresh_token in response - prompt=consent may not have been used');
    return htmlResponse(errorPage(), 502);
  }

  // Optional: Log warning if scope doesn't include gmail.readonly
  if (scope && !scope.includes('gmail.readonly')) {
    console.warn(`Unexpected scope granted: ${scope}`);
  }

  // Step 5: Fetch Gmail profile to get email address
  let gmailEmail: string;
  try {
    const profileResponse = await fetch(GMAIL_PROFILE_URL, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (profileResponse.status === 403) {
      console.warn("User's Google account doesn't have Gmail enabled");
      return htmlResponse(noGmailPage(), 200);
    }

    if (!profileResponse.ok) {
      console.error(`Gmail profile fetch failed: ${profileResponse.status}`);
      return htmlResponse(errorPage(), 502);
    }

    const profile = (await profileResponse.json()) as GmailProfile;
    gmailEmail = profile.emailAddress;
    console.info(`Token exchange succeeded for user_id: ${userId}, email: ${gmailEmail}`);
  } catch (profileError) {
    console.error('Gmail profile fetch failed:', profileError);
    return htmlResponse(errorPage(), 502);
  }

  // Step 6: Store tokens in database using service role key (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  // Calculate token expiry
  const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  try {
    const { error: upsertError } = await supabase.from('gmail_tokens').upsert(
      {
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: tokenExpiry,
        gmail_email: gmailEmail,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    );

    if (upsertError) {
      console.error(`Database upsert failed: ${upsertError.message}`);
      return htmlResponse(errorPage(), 502);
    }

    console.info(`Database upsert succeeded for user_id: ${userId}`);
  } catch (dbError) {
    console.error('Database operation failed:', dbError);
    return htmlResponse(errorPage(), 502);
  }

  // Step 7: Render success page
  return htmlResponse(successPage(), 200);
});
