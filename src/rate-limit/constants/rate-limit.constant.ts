export const RATE_LIMIT = {
    IP: {
        LIMIT: parseInt(process.env.IP_LIMIT || '5'),
        TTL_SECONDS: parseInt(process.env.IP_TTL_SECONDS || '60'),
        WINDOW_MS: parseInt(process.env.WINDOW_MS || '60000'),
    },
};