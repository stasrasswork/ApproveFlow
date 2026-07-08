import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EmailOutboxStatus } from '../generated/prisma/client.js';
import { MailService } from './mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const POLL_INTERVAL_MS = 5_000;
const BASE_BACKOFF_MS = 2_000;

export type HandoffEmailPayload = {
  clientUserIds: string[];
  workspaceId: string;
  taskId: string;
  projectId: string;
  taskTitle: string;
  projectName: string;
};

@Injectable()
export class EmailOutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailOutboxService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    this.timer = setInterval(() => {
      void this.processPending().catch((error) => {
        this.logger.error(
          'Email outbox processing failed',
          error instanceof Error ? error.stack : undefined,
        );
      });
    }, POLL_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async enqueueHandoffEmails(
    payload: HandoffEmailPayload,
    correlationId?: string,
  ): Promise<void> {
    await this.prisma.emailOutbox.create({
      data: {
        kind: 'TASK_CLIENT_HANDOFF',
        payload,
        correlationId: correlationId ?? payload.taskId,
      },
    });
    await this.processPending();
  }

  async processPending(): Promise<void> {
    const now = new Date();
    const pending = await this.prisma.emailOutbox.findMany({
      where: {
        status: EmailOutboxStatus.PENDING,
        nextRetryAt: { lte: now },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    for (const entry of pending) {
      await this.processEntry(entry.id);
    }
  }

  private async processEntry(entryId: string): Promise<void> {
    const entry = await this.prisma.emailOutbox.findUnique({
      where: { id: entryId },
    });
    if (!entry || entry.status !== EmailOutboxStatus.PENDING) {
      return;
    }

    try {
      if (entry.kind === 'TASK_CLIENT_HANDOFF') {
        await this.deliverHandoffEmails(entry.payload as HandoffEmailPayload);
      }

      await this.prisma.emailOutbox.update({
        where: { id: entry.id },
        data: {
          status: EmailOutboxStatus.SENT,
          attempts: { increment: 1 },
          lastError: null,
        },
      });
    } catch (error) {
      const attempts = entry.attempts + 1;
      const message =
        error instanceof Error ? error.message : 'Unknown delivery error';
      const failed = attempts >= entry.maxAttempts;

      await this.prisma.emailOutbox.update({
        where: { id: entry.id },
        data: {
          status: failed ? EmailOutboxStatus.FAILED : EmailOutboxStatus.PENDING,
          attempts,
          lastError: message,
          nextRetryAt: failed
            ? entry.nextRetryAt
            : new Date(Date.now() + BASE_BACKOFF_MS * attempts),
        },
      });

      this.logger.warn(
        `Email outbox ${entry.id} attempt ${attempts} failed (${entry.correlationId ?? 'no-correlation'}): ${message}`,
      );
    }
  }

  private async deliverHandoffEmails(payload: HandoffEmailPayload): Promise<void> {
    const title = 'Task awaiting your review';
    const body = `"${payload.taskTitle}" in ${payload.projectName} was sent to you for approval.`;
    const link = `/w/${payload.workspaceId}/projects/${payload.projectId}/tasks/${payload.taskId}`;

    const users = await this.prisma.user.findMany({
      where: { id: { in: payload.clientUserIds } },
      select: { email: true },
    });

    for (const user of users) {
      const url = this.mail.appUrl(link);
      const sent = await this.mail.send({
        to: user.email,
        subject: title,
        text: `${body}\n\nOpen: ${url}`,
      });
      if (!sent) {
        throw new Error(`Failed to send email to ${user.email}`);
      }
    }
  }
}
