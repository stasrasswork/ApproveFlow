import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

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
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASS
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              }
            : undefined,
      });
    }

    return this.transporter;
  }

  async send(options: SendMailOptions): Promise<boolean> {
    const from = process.env.SMTP_FROM ?? 'noreply@approveflow.local';

    if (!this.isConfigured()) {
      this.logger.warn(
        `SMTP not configured — email to ${options.to}: ${options.subject}`,
      );
      this.logger.debug(options.text);
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
    const base = (process.env.APP_URL ?? 'http://localhost:5173').replace(
      /\/$/,
      '',
    );
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }
}
