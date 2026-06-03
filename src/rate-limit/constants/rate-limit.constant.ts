export const RATE_LIMIT = {
    IP: {
        LIMIT: parseInt(process.env.IP_LIMIT || '20'),
        TTL_SECONDS: parseInt(process.env.IP_TTL_SECONDS || '60'),
    },
    SLIDING_WINDOW: {
        WINDOW_MS: parseInt(process.env.WINDOW_MS || '60000'),
    },
    IP_TOKEN_BUCKET: {
        BUCKET_SIZE: parseInt(process.env.IP_TOKEN_BUCKET_SIZE || '10'),
        REFILL_PER_MINUTE: parseInt(process.env.IP_REFILL_PER_MINUTE || '10'),
    },
    USER_TOKEN_BUCKET: {
        BUCKET_SIZE: parseInt(process.env.USER_TOKEN_BUCKET_SIZE || '20'),
        REFILL_PER_MINUTE: parseInt(process.env.USER_REFILL_PER_MINUTE || '20'),
    },
    USER: {
        LIMIT: parseInt(process.env.USER_LIMIT || '20'),
        TTL_SECONDS: parseInt(process.env.USER_TTL_SECONDS || '60'),
    }
};