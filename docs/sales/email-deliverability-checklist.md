# Email Deliverability Checklist

Date checked: 2026-04-27

Domain: `octo-bot.io`

## Current DNS Findings

MX:

```text
0 octobot-io01b.mail.protection.outlook.com.
```

TXT:

```text
NETORGFT20301870.onmicrosoft.com
v=spf1 include:secureserver.net -all
```

DMARC:

```text
v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;
```

DKIM:

```text
No selector1._domainkey or selector2._domainkey records found by DNS lookup.
However, the Gmail test header reported Microsoft-side DKIM pass for header.d=octo-bot.io.
```

Gmail test header:

```text
Received from FR4P281CU032.outbound.protection.outlook.com
Received-SPF: pass
Authentication-Results: mx.google.com; spf=pass; dmarc=pass
ARC-Authentication-Results: i=1; mx.microsoft.com; spf=pass; dmarc=pass; dkim=pass header.d=octo-bot.io
```

## Interpretation

The sending provider is Microsoft 365 / Exchange Online. The header shows outbound mail passing through `outbound.protection.outlook.com` and `PROD.OUTLOOK.COM`.

SPF is currently acceptable for Microsoft sending because `include:secureserver.net` expands through GoDaddy's SPF chain to include `spf.protection.outlook.com`.

The test email passed SPF and DMARC at Gmail. Microsoft also reported DKIM pass for `octo-bot.io`. This is good enough for the first low-volume outreach batch.

The visible `arc=fail` at Gmail is not the main deliverability signal here. ARC is an optional forwarded-message authentication chain. SPF and DMARC passed, and Microsoft reported DKIM pass.

## What To Check Before Sending Outreach

1. Confirm the exact sender address.
   - The test screenshot used `support@octo-bot.io`.
   - Send one test from `hello@octo-bot.io` too if that is the address used for outreach.
   - If both are aliases on the same Microsoft tenant, the result should be the same.

2. Enable DKIM for the custom domain if the mail provider supports it.
   - Microsoft 365 custom domain DKIM generally uses two CNAME records:
     - `selector1._domainkey`
     - `selector2._domainkey`
   - The exact target values must come from the Microsoft 365 admin center or Exchange Online PowerShell for this tenant.

3. Send two test emails before outreach.
   - Send one to a Gmail address.
   - Send one to an Outlook/Hotmail address.
   - Check message details for SPF, DKIM, and DMARC pass/fail.

4. Start with low volume.
   - Send 5 emails on April 27, 2026.
   - Wait for bounces or spam-folder issues before sending the next 5.

## Optional SPF Simplification

The current SPF passes the Gmail test. If the domain sends only through Microsoft 365, SPF could later be simplified to:

```text
v=spf1 include:spf.protection.outlook.com -all
```

If both Microsoft 365 and another provider legitimately send mail for this domain, keep all valid senders in one SPF record, for example:

```text
v=spf1 include:spf.protection.outlook.com include:secureserver.net -all
```

Keep the record under the SPF 10-DNS-lookup limit.

## Sources

- Microsoft Learn: Set up SPF to identify valid email sources for a Microsoft 365 domain: https://learn.microsoft.com/en-us/microsoft-365/security/office-365-security/how-office-365-uses-spf-to-prevent-spoofing
- Microsoft Learn: Configure DKIM for outbound messages from a Microsoft 365 custom domain: https://learn.microsoft.com/en-us/defender-office-365/email-authentication-dkim-configure
