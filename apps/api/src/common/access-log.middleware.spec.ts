import { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import { accessLogMiddleware } from './access-log.middleware.js';

describe('accessLogMiddleware', () => {
  it('skips health checks', () => {
    const next = jest.fn();
    const res = Object.assign(new EventEmitter(), {
      statusCode: 200,
      on: jest.fn(),
    });

    accessLogMiddleware(
      { path: '/health/ready', method: 'GET', originalUrl: '/health/ready' } as never,
      res as never,
      next,
    );

    expect(next).toHaveBeenCalled();
    expect(res.on).not.toHaveBeenCalled();
  });

  it('logs method, url, status, and duration on finish', () => {
    const next = jest.fn();
    const res = new EventEmitter() as EventEmitter & { statusCode: number };
    res.statusCode = 201;
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    accessLogMiddleware(
      {
        path: '/workspaces/ws-1/members',
        method: 'POST',
        originalUrl: '/workspaces/ws-1/members',
      } as never,
      res as never,
      next,
    );

    expect(next).toHaveBeenCalled();
    res.emit('finish');

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^POST \/workspaces\/ws-1\/members 201 \d+\.\d+s$/),
    );

    logSpy.mockRestore();
  });
});
