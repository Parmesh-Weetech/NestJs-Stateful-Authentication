export const RATE_LIMITS = {
  FREE: {
    minute: 10,
    hour: 5,
    day: 10,
  },

  PRO: {
    minute: 100,
    hour: 1000,
    day: 10000,
  },

  ENTERPRISE: {
    minute: 1000,
    hour: 10000,
    day: 100000,
  },
};

export const RATE_LIMIT_WINDOWS = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
};
