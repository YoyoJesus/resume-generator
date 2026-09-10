# Security Policy

## Supported versions

Security fixes are applied to the latest code on `main` and the current production deployment. Older commits, forks, and
unmaintained deployments are not supported.

## Reporting a vulnerability

Please report vulnerabilities privately using
[GitHub's security-advisory form](https://github.com/YoyoJesus/resume-generator/security/advisories/new). Do not open a
public issue for a vulnerability that could expose user data, API credentials, or deployment infrastructure.

Include, when possible:

- A clear description of the vulnerability and its impact.
- Reproduction steps or a minimal proof of concept.
- Affected routes, files, browser versions, or deployments.
- Any suggested remediation.

Use synthetic data. Never attach a real resume, API key, session-storage contents, or other personal information.

The maintainer will aim to acknowledge a report within seven days, investigate it, and coordinate disclosure after a fix
is available. Please allow a reasonable remediation period before public disclosure.

## Security boundaries

- OpenAI API keys must remain in server-only environment variables.
- Uploaded content is untrusted and must pass documented size and validation gates.
- Original resume files should remain in the browser; only explicitly approved extracted text should reach AI routes.
- Browser storage is convenience storage, not a secure vault. Do not store secrets in it.
