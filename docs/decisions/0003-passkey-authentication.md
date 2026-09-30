# Passkey authentication

## Context

Workbench needs convenient biometric-style login on mobile for the Vercel test environment without handling biometric data or adding device-specific authentication code.

## Decision

Use Supabase Auth's experimental WebAuthn passkey support. Authenticated users register passkeys from Profile Preferences, and the public login page offers passkey sign-in alongside password login. The Supabase project must use a stable relying-party ID and exact allowed origins for the Vercel test domain and localhost.

## Consequences

- Face ID, Touch ID, Android biometrics, device PINs, and hardware keys can authorize the platform passkey without Workbench receiving biometric data.
- Passkeys are origin-bound; localhost and the Vercel domain have separate registration scope unless they share a valid relying-party domain.
- Password login remains available as a recovery path.
- Supabase currently labels this passkey API experimental, so the client wrapper is isolated in `src/services/authService.js` for future API changes.
