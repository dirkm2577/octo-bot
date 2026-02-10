/**
 * HTML Templates for OAuth Callback Responses
 * Per spec: docs/specs/gmail-oauth-edge-functions.md (Section 3.2)
 *
 * These are rendered in the user's browser after Google redirects back.
 * All pages are calm and instructional, not alarming.
 */

const baseStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: #f5f5f7;
    padding: 1rem;
  }
  .container {
    text-align: center;
    padding: 2.5rem;
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    max-width: 420px;
    width: 100%;
  }
  .icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  h1 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    color: #1d1d1f;
  }
  p {
    color: #6e6e73;
    font-size: 1rem;
    line-height: 1.5;
  }
`;

function htmlPage(
  title: string,
  icon: string,
  heading: string,
  message: string,
  headingColor: string = '#1d1d1f'
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} - octo-bot</title>
  <style>
    ${baseStyles}
    h1 { color: ${headingColor}; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${icon}</div>
    <h1>${heading}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

/**
 * Success page - Gmail connected successfully
 * HTTP Status: 200
 */
export function successPage(): string {
  return htmlPage(
    'Gmail Connected',
    '✓',
    'Gmail Connected',
    'You can close this tab and return to octo-bot.',
    '#22c55e'
  );
}

/**
 * Cancelled page - User denied permission at Google consent screen
 * HTTP Status: 200 (not an error from user's perspective)
 */
export function cancelledPage(): string {
  return htmlPage(
    'Connection Cancelled',
    '←',
    'Connection Cancelled',
    'Gmail connection was cancelled. You can close this tab and try again from the app if you change your mind.',
    '#6e6e73'
  );
}

/**
 * Expired page - State parameter is invalid, expired, or tampered
 * HTTP Status: 400
 * Note: All state verification failures show this same generic message (security)
 */
export function expiredPage(): string {
  return htmlPage(
    'Link Expired',
    '⏱',
    'This Link Has Expired',
    'Please close this tab and try connecting Gmail again from the app.',
    '#f59e0b'
  );
}

/**
 * Error page - Token exchange failed or other server error
 * HTTP Status: 502
 */
export function errorPage(): string {
  return htmlPage(
    'Something Went Wrong',
    '!',
    'Something Went Wrong',
    'There was a problem connecting Gmail. Please close this tab and try again.',
    '#ef4444'
  );
}

/**
 * Already connected page - Race condition where user completed flow twice
 * HTTP Status: 200
 */
export function alreadyConnectedPage(): string {
  return htmlPage(
    'Gmail Connected',
    '✓',
    'Gmail Already Connected',
    'Your Gmail account is connected. You can close this tab.',
    '#22c55e'
  );
}

/**
 * No Gmail page - Google account doesn't have Gmail enabled
 * HTTP Status: 200
 */
export function noGmailPage(): string {
  return htmlPage(
    'Gmail Not Available',
    '✉',
    'Gmail Not Available',
    "This Google account doesn't have Gmail enabled. Please close this tab and try with a different account.",
    '#f59e0b'
  );
}

/**
 * Create an HTML response
 */
export function htmlResponse(html: string, status: number = 200): Response {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
