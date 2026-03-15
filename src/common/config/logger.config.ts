import type { Params } from 'nestjs-pino';

const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'req.body.password',
  'req.body.currentPassword',
  'req.body.newPassword',
  'req.body.token',
  'req.body.refreshToken',
  'req.body.accessToken',
  'req.body.cardNumber',
  'req.body.cvv',
  'req.body.ssn',
  'req.body.nationalId',
  'err.config.headers.authorization',
  'user.password',
];

export function getPinoConfig(): Params {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isDevelopment = nodeEnv === 'development';
  const isTest = nodeEnv === 'test';

  const level = isTest ? 'silent' : isDevelopment ? 'debug' : 'warn';

  return {
    pinoHttp: {
      level,
      redact: {
        paths: REDACTED_PATHS,
        censor: '[REDACTED]',
      },
      ...(isDevelopment && {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: false,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }),
      // Suppress noisy request/response logs for 4xx — the filter handles structured logging
      customSuccessMessage: (req, res) =>
        `${req.method} ${req.url} ${res.statusCode}`,
      customErrorMessage: (req, res) =>
        `${req.method} ${req.url} ${res.statusCode}`,
      // Don't auto-log 4xx/5xx — GlobalExceptionFilter handles that with richer context
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    },
  };
}
