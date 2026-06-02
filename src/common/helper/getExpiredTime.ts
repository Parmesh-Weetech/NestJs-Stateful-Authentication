export function getExpiredTime() {
    const sessionLifetimeMs = Number(process.env.SESSION_TTL_MS) || 1000 * 60 * 60 * 24;
    const sessionLifetimeSeconds = Math.max(1, Math.ceil(sessionLifetimeMs / 1000));

    return {
        ms: sessionLifetimeMs,
        seconds: sessionLifetimeSeconds,
    };
}
