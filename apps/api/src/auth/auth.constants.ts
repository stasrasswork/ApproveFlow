import { ENV } from '../config/env.js';

export const JWT_SECRET = ENV.JWT_SECRET ?? 'dev-secret-change-me';
