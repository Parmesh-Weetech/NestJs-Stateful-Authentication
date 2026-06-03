export const RATE_LIMIT = {
    IP: {
        LIMIT: parseInt(process.env.IP_LIMIT || '20'),
        TTL_SECONDS: parseInt(process.env.IP_TTL_SECONDS || '60'),
    },
    SLIDING_WINDOW: {
        WINDOW_MS: parseInt(process.env.WINDOW_MS || '60000'),
    },
    TOKEN_BUCKET: {
        BUCKET_SIZE: parseInt(process.env.TOKEN_BUCKET_SIZE || '20'),
        REFILL_PER_MINUTE: parseInt(process.env.REFILL_PER_MINUTE || '20'),
    }
};