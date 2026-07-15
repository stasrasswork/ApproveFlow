import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { ENV } from '../config/env.js';

export type SendMailOptions = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  isConfigured(): boolean {
    return Boolean(
      (process.env.SMTP_HOST ?? ENV.SMTP_HOST) &&
        (process.env.SMTP_FROM ?? ENV.SMTP_FROM),
    );
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST ?? ENV.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? ENV.SMTP_PORT),
        secure: (process.env.SMTP_SECURE ?? String(ENV.SMTP_SECURE)) === 'true',
        auth:
          (process.env.SMTP_USER ?? ENV.SMTP_USER) &&
          (process.env.SMTP_PASS ?? ENV.SMTP_PASS)
            ? {
                user: process.env.SMTP_USER ?? ENV.SMTP_USER,
                pass: process.env.SMTP_PASS ?? ENV.SMTP_PASS,
              }
            : undefined,
      });
    }

    return this.transporter;
  }

  async send(options: SendMailOptions): Promise<boolean> {
    const from = process.env.SMTP_FROM ?? ENV.SMTP_FROM ?? 'noreply@approveflow.local';

    if (!this.isConfigured()) {
      this.logger.warn(
        `SMTP not configured — email not sent to ${options.to} (subject: ${options.subject})`,
      );
      return false;
    }

    await this.getTransporter().sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html ?? options.text.replace(/\n/g, '<br>'),
    });

    return true;
  }

  appUrl(path: string): string {
    const base = (process.env.APP_URL ?? ENV.APP_URL).replace(/\/$/, '');
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }
}
