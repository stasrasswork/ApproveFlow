import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger('HTTP');

/** Minimal access log: `POST /workspaces/:id/members 200 1.2s` */
export function accessLogMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.path.startsWith('/health')) {
    next();
    return;
  }

  const started = Date.now();
  res.on('finish', () => {
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    logger.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${seconds}s`);
  });
  next();
}
