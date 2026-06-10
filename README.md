# Secure Session-Based Authentication in NestJS

Production-ready session authentication using:

- NestJS
- Passport.js
- express-session
- Redis
- PostgreSQL
- TypeORM
- bcrypt

---

# Table of Contents

- Introduction
- Why Session Authentication
- Architecture
- Authentication Flow
- Request Lifecycle
- Project Structure
- Complete Setup
- PostgreSQL Setup
- Redis Setup
- Package Installation
- TypeORM Configuration
- Session Configuration
- Passport Configuration
- Local Strategy
- Session Serialization
- Guards
- Controllers
- Redis Session Storage
- Redis TTL
- Cookie Flow
- Login Flow
- Logout Flow
- Request Flow
- Protected Routes
- Redis Session Internals
- Security Best Practices
- Production Deployment
- Common Mistakes
- Scaling
- Horizontal Scaling
- Session Fixation
- CSRF
- Device Sessions
- RBAC
- Debugging
- Testing
- Redis Commands
- API Endpoints
- Future Improvements

---

# Introduction

This project demonstrates how to implement secure session-based authentication in NestJS using Redis as a session store.

Unlike JWT authentication where tokens are stored client-side, session authentication stores authentication state on the server.

The browser only stores:

- session ID

The server stores:

- actual session data

This approach is widely used in:

- enterprise applications
- admin dashboards
- banking systems
- internal tools
- SaaS dashboards

---

# Why Session Authentication

## Advantages

### Server-side control

You can:

- instantly logout users
- revoke sessions
- invalidate compromised accounts
- track active devices

---

### Better browser security

Cookies can be:

- HTTP-only
- secure
- sameSite protected

This reduces token theft risks.

---

### Easier invalidation

With JWT:

- tokens remain valid until expiration

With sessions:

- delete Redis session
- user instantly logged out

---

### Centralized authentication

Authentication state lives in Redis.

Useful for:

- multiple servers
- scaling
- admin controls
- security monitoring

---

# High Level Architecture

```text
Browser
   |
   | Cookie: connect.sid
   v
NestJS Server
   |
   | express-session middleware
   v
Redis Session Store
   |
   | Passport Session
   v
PostgreSQL Database
```

---

# Core Components

| Component       | Purpose                  |
| --------------- | ------------------------ |
| Browser Cookie  | Stores session ID        |
| Redis           | Stores session data      |
| PostgreSQL      | Stores users             |
| Passport        | Authentication framework |
| express-session | Session middleware       |
| TypeORM         | Database ORM             |

---

# Authentication Flow

```text
1. User logs in
2. Passport validates credentials
3. Session created
4. Session stored in Redis
5. Cookie sent to browser
6. Browser stores session ID
7. Browser sends cookie on future requests
8. Redis session retrieved
9. User restored
10. Route authenticated
```

---

# Important Concept

## Browser DOES NOT store authentication data

Browser only stores:

```text
connect.sid=s%3Afjksdf...
```

Redis stores actual session:

```json
{
  "passport": {
    "user": "user-id"
  }
}
```

This separation is the core of session authentication.

---

# Complete Request Lifecycle

# Login Request

```http
POST /auth/login
```

Body:

```json
{
  "email": "test@gmail.com",
  "password": "123456"
}
```

---

# Step-by-Step Internal Flow

## Step 1: Request Hits Controller

```ts
@UseGuards(LocalAuthGuard)
@Post('login')
login(@Req() req: Request)
```

---

## Step 2: LocalAuthGuard Executes

```ts
AuthGuard('local');
```

This internally calls:

```ts
passport.authenticate('local');
```

---

## Step 3: LocalStrategy Executes

```ts
validate(email, password);
```

Passport extracts:

- email
- password

from request body.

---

## Step 4: Validate User

```ts
const user = await authService.validateUser(email, password);
```

---

## Step 5: Find User in PostgreSQL

```ts
await userRepository.findOne({
  where: { email },
});
```

---

## Step 6: Compare Password

```ts
bcrypt.compare(password, user.password);
```

Passwords are never stored in plain text.

---

## Step 7: User Authenticated

Passport receives valid user object.

Example:

```json
{
  "id": "uuid",
  "email": "test@gmail.com"
}
```

---

## Step 8: serializeUser() Executes

```ts
serializeUser(user, done);
```

Stores minimal data:

```ts
done(null, user.id);
```

Only user ID stored in session.

---

## Step 9: Session Created

express-session generates session ID:

```text
s%3Afjksdfhsdkjf
```

---

## Step 10: Session Stored in Redis

Redis key:

```text
sess:s%3Afjksdfhsdkjf
```

Redis value:

```json
{
  "cookie": {
    "expires": "2026..."
  },
  "passport": {
    "user": "uuid"
  }
}
```

---

## Step 11: Cookie Sent to Browser

Response header:

```http
Set-Cookie: connect.sid=s%3Afjksdf...
```

Browser stores cookie automatically.

---

# Future Request Flow

When user accesses protected route:

```http
GET /auth/me
```

Browser automatically sends:

```http
Cookie: connect.sid=s%3Afjksdf...
```

---

# Protected Route Lifecycle

## Step 1: express-session Reads Cookie

Extracts:

```text
connect.sid
```

---

## Step 2: Redis Lookup

```text
GET sess:s%3Afjksdf...
```

---

## Step 3: Passport Restores User

```ts
deserializeUser(userId);
```

---

## Step 4: User Loaded From PostgreSQL

```ts
findById(userId);
```

Fresh database lookup every request.

This ensures:

- latest permissions
- latest roles
- deleted users invalidated

---

## Step 5: req.user Attached

```ts
req.user = user;
```

---

## Step 6: Route Access Granted

```ts
request.isAuthenticated();
```

returns:

```text
true
```

---

# Why Redis Is Used

Without Redis:

- sessions stored in server memory
- server restart destroys sessions
- scaling impossible

Redis solves:

- persistence
- centralized sessions
- horizontal scaling
- TTL expiration
- performance

---

# Why TTL Is Important

TTL = Time To Live

Example:

```ts
ttl: 60 * 60 * 24;
```

Meaning:

```text
86400 seconds = 1 day
```

Redis automatically deletes expired sessions.

No manual cleanup required.

---

# Redis Session Lifecycle

```text
Session Created
     |
     v
Stored in Redis
     |
     v
TTL countdown starts
     |
     v
User active?
     |
     +--> YES -> Session refreshed
     |
     +--> NO
              |
              v
        Redis deletes session
```

---

# Recommended Folder Structure

```text
src/
├── auth/
│   ├── dto/
│   ├── guards/
│   ├── serializers/
│   ├── strategies/
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   └── auth.service.ts
│
├── user/
│   ├── entities/
│   ├── user.module.ts
│   └── user.service.ts
│
├── common/
│   ├── guards/
│   ├── interceptors/
│   └── decorators/
│
├── config/
│   ├── redis.config.ts
│   └── session.config.ts
│
├── app.module.ts
└── main.ts
```

---

# PostgreSQL Setup

## Ubuntu

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

Start PostgreSQL:

```bash
sudo systemctl start postgresql
```

Open PostgreSQL:

```bash
sudo -u postgres psql
```

Create database:

```sql
CREATE DATABASE nest_auth;
```

Create user:

```sql
CREATE USER nestuser WITH PASSWORD 'password';
```

Grant permissions:

```sql
GRANT ALL PRIVILEGES ON DATABASE nest_auth TO nestuser;
```

Exit:

```sql
\q
```

---

# Redis Setup

## Install Redis

```bash
sudo apt install redis-server
```

Start Redis:

```bash
sudo systemctl start redis-server
```

Test Redis:

```bash
redis-cli ping
```

Output:

```text
PONG
```

Tiny confirmation that at least one component in your stack still believes in you.

---

# Package Installation

## Main Packages

```bash
pnpm add @nestjs/typeorm typeorm pg
pnpm add passport @nestjs/passport passport-local
pnpm add express-session
pnpm add redis connect-redis
pnpm add bcrypt
pnpm add class-validator class-transformer
```

---

# Dev Dependencies

```bash
pnpm add -D @types/passport-local
pnpm add -D @types/express-session
pnpm add -D @types/bcrypt
```

---

# User Entity

```ts
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    unique: true,
  })
  email: string;

  @Column()
  password: string;
}
```

---

# Why Passwords Must Be Hashed

Never store:

```text
123456
```

Always store:

```text
$2b$10$asdjhasdkjh...
```

bcrypt hashing protects users even if database leaks.

---

# Session Configuration

```ts
app.use(
  session({
    store: new RedisStore({
      client: redisClient,
      ttl: 60 * 60 * 24,
    }),

    secret: process.env.SESSION_SECRET,

    resave: false,

    saveUninitialized: false,

    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    },
  }),
);
```

---

# Session Configuration Explained

| Option            | Purpose                 |
| ----------------- | ----------------------- |
| store             | Redis session storage   |
| ttl               | Session expiration      |
| secret            | Cookie signing          |
| resave            | Avoid unnecessary saves |
| saveUninitialized | Prevent empty sessions  |
| httpOnly          | Block JavaScript access |
| secure            | HTTPS-only cookies      |
| sameSite          | CSRF protection         |

---

# Why httpOnly Matters

Without httpOnly:

```js
document.cookie;
```

can expose session cookie.

With httpOnly:

- JavaScript cannot access cookies
- helps prevent XSS token theft

---

# Passport Configuration

```ts
PassportModule.register({
  session: true,
});
```

Enables:

- serializeUser
- deserializeUser
- persistent sessions

---

# Local Strategy

```ts
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
    });
  }

  async validate(email: string, password: string) {
    const user = await this.authService.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
```

---

# Why Local Strategy Exists

Separates:

- authentication logic
- controller logic

Passport strategies make authentication modular.

Later you can add:

- JWT
- OAuth2
- GitHub auth
- LDAP
- SAML

without rewriting application structure.

---

# LocalAuthGuard

```ts
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
```

Purpose:

- triggers LocalStrategy
- validates credentials
- creates session
- attaches req.user

---

# Session Serializer

```ts
serializeUser(user, done) {
  done(null, user.id);
}
```

Stores only user ID in session.

---

# Why Only User ID Is Stored

Avoid:

- stale data
- huge sessions
- duplicated user state

Always fetch fresh user from database.

---

# deserializeUser()

```ts
async deserializeUser(userId, done) {
  const user =
    await this.userService.findById(userId);

  done(null, user);
}
```

Runs on every authenticated request.

---

# Authenticated Guard

```ts
request.isAuthenticated();
```

Checks whether:

- valid session exists
- Passport restored user

---

# Logout Flow

```ts
req.logout(() => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
  });
});
```

---

# Logout Lifecycle

## Step 1

Remove Passport user.

## Step 2

Destroy Redis session.

## Step 3

Clear browser cookie.

Authentication fully removed.

---

# API Endpoints

# Register

```http
POST /auth/register
```

Body:

```json
{
  "email": "test@gmail.com",
  "password": "123456"
}
```

---

# Login

```http
POST /auth/login
```

Body:

```json
{
  "email": "test@gmail.com",
  "password": "123456"
}
```

---

# Current User

```http
GET /auth/me
```

Requires authentication.

---

# Logout

```http
POST /auth/logout
```

---

# Redis Commands

## View Keys

```bash
KEYS *
```

---

## Get Session

```bash
GET sess:xxxxx
```

---

## Check TTL

```bash
TTL sess:xxxxx
```

---

# Example Redis Session

```json
{
  "cookie": {
    "originalMaxAge": 86400000,
    "expires": "2026-01-01T00:00:00.000Z",
    "secure": false,
    "httpOnly": true,
    "path": "/"
  },

  "passport": {
    "user": "uuid"
  }
}
```

---

# Security Best Practices

# Use Environment Variables

Never hardcode:

- DB password
- Redis password
- session secret

---

# Use HTTPS

Production:

```ts
secure: true;
```

---

# Trust Proxy

If behind nginx:

```ts
app.set('trust proxy', 1);
```

---

# Session Rotation

Prevent session fixation:

```ts
req.session.regenerate(() => {});
```

---

# Add Rate Limiting

Use:

- @nestjs/throttler
- Redis throttling

Protects against brute force attacks.

---

# Add CSRF Protection

Session auth uses cookies.

Cookies automatically send themselves.

Use:

- csurf

for additional protection.

---

# Horizontal Scaling

With Redis:

- multiple servers share same sessions

Architecture:

```text
Load Balancer
    |
    +--> NestJS Server 1
    |
    +--> NestJS Server 2
    |
    +--> NestJS Server 3
               |
               v
             Redis
```

All servers use same session store.

---

# Common Mistakes

# Storing Entire User in Session

Bad:

```json
{
  "email": "...",
  "role": "...",
  "permissions": [...]
}
```

Good:

```json
{
  "user": "uuid"
}
```

---

# Using MemoryStore in Production

Default MemoryStore:

- not scalable
- memory leaks
- sessions lost on restart

Always use Redis.

---

# Forgetting secure: true

Without HTTPS secure cookies:

- vulnerable on public networks

---

# Hardcoding Secrets

Never commit:

```env
SESSION_SECRET=123
```

to GitHub.

Human beings continue doing this despite decades of collective warning. Anthropology students will study leaked `.env` files someday.

---

# Future Improvements

After completing this system, add:

- RBAC
- permissions
- refresh sessions
- device sessions
- audit logs
- MFA/TOTP
- email verification
- forgot password
- account lockout
- Redis caching
- OAuth2
- WebAuthn/passkeys

---

# Notifications (In-app)

This project includes an in-app notification system that supports:

- **Persisted notifications** in PostgreSQL (`notifications` table)
- **Read/unread tracking** via `isRead` and `readAt`
- **Real-time delivery while the app is open** using **SSE**

## SSE Stream

- `GET /notifications/stream`

The SSE server sends events only when the user has an active SSE connection.

## Notification History / Read State

- `GET /notifications/:userId` (filter by `isRead`)
- `PATCH /notifications/read/:notificationId`
- `PATCH /notifications/read/all/:userId`
- `DELETE /notifications/:notificationId`
- `DELETE /notifications/:userId`

---

# Recommended Tools

## API Testing

- :contentReference[oaicite:0]{index=0}
- :contentReference[oaicite:1]{index=1}

---

## Redis GUI

- :contentReference[oaicite:2]{index=2}

---

# Final Mental Model

## Browser Stores

```text
session id
```

---

## Redis Stores

```text
session data
```

---

## PostgreSQL Stores

```text
actual users
```

---

# Entire System in One Diagram

```text
LOGIN

Browser
   |
   | email/password
   v
NestJS
   |
   v
Passport Local Strategy
   |
   v
PostgreSQL User Validation
   |
   v
Redis Session Created
   |
   v
Cookie Sent To Browser

----------------------------------

AUTHENTICATED REQUEST

Browser
   |
   | connect.sid cookie
   v
NestJS
   |
   v
express-session
   |
   v
Redis Session Lookup
   |
   v
Passport deserializeUser()
   |
   v
PostgreSQL User Fetch
   |
   v
req.user attached
   |
   v
Protected Route Access
```

---

# Conclusion

This authentication architecture is:

- secure
- scalable
- production-proven
- browser-friendly
- enterprise-ready

It is still one of the strongest choices for:

- admin systems
- dashboards
- enterprise SaaS
- internal tooling
- multi-device authenticated systems

Despite the tech industry periodically declaring sessions “obsolete” every few years before quietly rebuilding them under different names. Software engineering is a flat circle.
