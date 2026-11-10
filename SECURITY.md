# Security Policy

## Reporting a vulnerability

Please do not report security vulnerabilities in public GitHub issues. Contact the repository owner privately through GitHub: https://github.com/kayiwarahim.

## Credential handling

- Never commit API keys, account secrets or webhook secrets.
- Keep credentials on trusted server-side systems.
- Do not log authorization headers or full payment payloads containing personal data.
- Verify webhook signatures and make webhook processing idempotent.
- Reconcile uncertain payment outcomes before retrying a payment request.
