# Email Deliverability Checklist

Date checked: 2026-04-26

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
No selector1._domainkey or selector2._domainkey records found.
```

## Main Risk

The domain appears to receive mail through Microsoft 365 / Exchange Online because the MX record points to `mail.protection.outlook.com`.

The SPF record currently authorizes `secureserver.net`, not `spf.protection.outlook.com`.

If outbound mail from `hello@octo-bot.io` is sent through Microsoft 365 / Outlook, this mismatch may reduce deliverability, especially because DMARC is already set to `p=quarantine` and no DKIM records were found.

## What To Check Before Sending Outreach

1. Confirm the sending provider for `hello@octo-bot.io`.
   - If sending from Microsoft 365 / Outlook, the SPF record should usually include `include:spf.protection.outlook.com`.
   - If sending from GoDaddy Professional Email / Workspace Email, follow GoDaddy's SPF instructions.
   - Do not create multiple SPF TXT records. There should be one SPF record only.

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

## Suggested SPF If Sending Through Microsoft 365 Only

Use this only if `hello@octo-bot.io` sends through Microsoft 365 / Outlook:

```text
v=spf1 include:spf.protection.outlook.com -all
```

If both Microsoft 365 and another provider legitimately send mail for this domain, combine the valid senders into one SPF record, for example:

```text
v=spf1 include:spf.protection.outlook.com include:secureserver.net -all
```

Keep the record under the SPF 10-DNS-lookup limit.

## Sources

- Microsoft Learn: Set up SPF to identify valid email sources for a Microsoft 365 domain: https://learn.microsoft.com/en-us/microsoft-365/security/office-365-security/how-office-365-uses-spf-to-prevent-spoofing
- Microsoft Learn: Configure DKIM for outbound messages from a Microsoft 365 custom domain: https://learn.microsoft.com/en-us/defender-office-365/email-authentication-dkim-configure
