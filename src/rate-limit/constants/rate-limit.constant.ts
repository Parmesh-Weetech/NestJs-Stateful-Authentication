export const RATE_LIMIT = {
    SLIDING_WINDOW: {
        WINDOW_MS: parseInt(process.env.WINDOW_MS || '60000'),
    },
    IP: {
        LIMIT: parseInt(process.env.IP_LIMIT || '20'),
        TTL_SECONDS: parseInt(process.env.IP_TTL_SECONDS || '60'),
    },
    USER: {
        LIMIT: parseInt(process.env.USER_LIMIT || '20'),
        TTL_SECONDS: parseInt(process.env.USER_TTL_SECONDS || '60'),
    },
    DEVICE: {
        LIMIT: parseInt(process.env.DEVICE_LIMIT || '10'),
        TTL_SECONDS: parseInt(process.env.DEVICE_TTL_SECONDS || '60'),
    },
    FINGERPRINT: {
        LIMIT: parseInt(process.env.FINGERPRINT_LIMIT || '1'),
        TTL_SECONDS: parseInt(process.env.FINGERPRINT_TTL_SECONDS || '60'),
    },
    SESSION: {
        LIMIT: parseInt(process.env.SESSION_LIMIT || '10'),
        TTL_SECONDS: parseInt(process.env.SESSION_TTL_SECONDS || '60'),
    },
    IP_TOKEN_BUCKET: {
        BUCKET_SIZE: parseInt(process.env.IP_TOKEN_BUCKET_SIZE || '10'),
        REFILL_PER_MINUTE: parseInt(process.env.IP_REFILL_PER_MINUTE || '10'),
    },
    DEVICE_TOKEN_BUCKET: {
        BUCKET_SIZE: parseInt(process.env.DEVICE_TOKEN_BUCKET_SIZE || '10'),
        REFILL_PER_MINUTE: parseInt(process.env.DEVICE_REFILL_PER_MINUTE || '10'),
    },
    USER_TOKEN_BUCKET: {
        BUCKET_SIZE: parseInt(process.env.USER_TOKEN_BUCKET_SIZE || '10'),
        REFILL_PER_MINUTE: parseInt(process.env.USER_REFILL_PER_MINUTE || '20'),
    },
    FINGERPRINT_TOKEN_BUCKET: {
        BUCKET_SIZE: parseInt(process.env.FINGERPRINT_TOKEN_BUCKET_SIZE || '10'),
        REFILL_PER_MINUTE: parseInt(process.env.FINGERPRINT_REFILL_PER_MINUTE || '10'),
    },
    SESSION_TOKEN_BUCKET: {
        BUCKET_SIZE: parseInt(process.env.SESSION_TOKEN_BUCKET_SIZE || '10'),
        REFILL_PER_MINUTE: parseInt(process.env.SESSION_REFILL_PER_MINUTE || '10'),
    },
};