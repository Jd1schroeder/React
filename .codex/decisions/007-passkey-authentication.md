# Decision 007: Passkey authentication

## Context

Workbench needs passkey sign-in while keeping biometric and device-authenticator data outside the application.

## Decision

Use Supabase Auth's experimental WebAuthn passkey support. Authenticated users register from Profile Preferences; the public login page offers passkey sign-in alongside password login. Keep the Supabase relying-party ID stable and configure exact allowed origins.

## Alternatives considered

- Implement a custom biometric system: rejected because device biometrics remain with the platform authenticator and Workbench only needs the signed WebAuthn result.
- Remove password recovery: rejected; password remains a fallback.

## Consequences

- Passkeys are origin-bound; changing the relying-party ID can invalidate registered credentials.
- Browser cancellation and ceremony timeouts are expected user outcomes, not security failures.
- Keep the experimental API isolated behind `src/services/authService.js` so it can change without spreading through the UI.

## Related knowledge

- Skills: [API](../skills/api/SKILL.md), [Security](../skills/security/SKILL.md)
- Pattern: [Application shell and settings](../patterns/frontend/application-shell-and-settings.md)
