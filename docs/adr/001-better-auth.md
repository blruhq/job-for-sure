# ADR-001: Use Better Auth over NextAuth/Auth.js

**Status:** Accepted

**Context:** We need email/password auth with Google OAuth, session management, and email verification. The project uses Drizzle ORM with PostgreSQL (Neon Serverless).

**Decision:** Use Better Auth instead of NextAuth.js. Better Auth provides built-in Drizzle adapter (no manual adapter code), email verification and password reset out of the box, and a cleaner API for both server and client. It also ships a cookie-based session helper that works with Next.js 16's proxy middleware.

**Consequences:** We depend on a newer auth library with a smaller ecosystem than NextAuth. If the library stops being maintained, migration path is to switch to NextAuth.js or implement custom auth. The Drizzle adapter is maintained by Better Auth directly, reducing adapter drift risk.
