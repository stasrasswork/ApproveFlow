import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import {
  WorkspaceMember,
  WorkspaceRole,
} from '../generated/prisma/client.js';
import {
  normalizeEmail,
  userBriefSelect,
  type UserBrief,
} from '../common/index.js';
import { ENV } from '../config/env.js';
import { MailService } from '../mail/mail.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const INVITE_TOKEN_BYTES = 32;
const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type WorkspaceMemberWithUser = WorkspaceMember & {
  user: UserBrief;
};

export type InviteWorkspaceResult =
  | { status: 'added'; member: WorkspaceMemberWithUser }
  | { status: 'pending'; message: string; inviteToken?: string };

@Injectable()
export class WorkspaceInvitesService {
  private readonly logger = new Logger(WorkspaceInvitesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
  ) {}

  async acceptInviteToken(
    rawToken: string,
    userId: string,
  ): Promise<WorkspaceMemberWithUser> {
    const tokenHash = this.hashToken(rawToken);
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { tokenHash },
      include: {
        workspace: { select: { id: true, name: true } },
      },
    });

    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired invite');
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true },
    });

    if (normalizeEmail(user.email) !== normalizeEmail(invite.email)) {
      throw new BadRequestException('Invite email does not match your account');
    }

    return this.prisma.$transaction(async (tx) => {
      const member = await tx.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: invite.workspaceId,
            userId,
          },
        },
        update: { role: invite.role },
        create: {
          workspaceId: invite.workspaceId,
          userId,
          role: invite.role,
        },
        include: { user: { select: userBriefSelect } },
      });

      await tx.workspaceInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date(), acceptedById: userId },
      });

      await this.notifications.notifyWorkspaceInvite(tx, {
        userId,
        workspaceId: invite.workspaceId,
        workspaceName: invite.workspace.name,
      });

      return member;
    });
  }

  async acceptPendingInvitesForEmail(
    userId: string,
    email: string,
  ): Promise<number> {
    const normalizedEmail = normalizeEmail(email);
    const pendingInvites = await this.prisma.workspaceInvite.findMany({
      where: {
        email: normalizedEmail,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        workspace: { select: { id: true, name: true } },
      },
    });

    let accepted = 0;

    for (const invite of pendingInvites) {
      await this.prisma.$transaction(async (tx) => {
        await tx.workspaceMember.upsert({
          where: {
            workspaceId_userId: {
              workspaceId: invite.workspaceId,
              userId,
            },
          },
          update: { role: invite.role },
          create: {
            workspaceId: invite.workspaceId,
            userId,
            role: invite.role,
          },
        });

        await tx.workspaceInvite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date(), acceptedById: userId },
        });

        await this.notifications.notifyWorkspaceInvite(tx, {
          userId,
          workspaceId: invite.workspaceId,
          workspaceName: invite.workspace.name,
        });
      });

      accepted += 1;
    }

    return accepted;
  }

  async createEmailInvite(
    workspaceId: string,
    invitedById: string,
    email: string,
    role: WorkspaceRole,
    workspaceName: string,
  ): Promise<InviteWorkspaceResult> {
    const normalizedEmail = normalizeEmail(email);
    const rawToken = randomBytes(INVITE_TOKEN_BYTES).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_MS);

    await this.prisma.workspaceInvite.deleteMany({
      where: { workspaceId, email: normalizedEmail, acceptedAt: null },
    });

    await this.prisma.workspaceInvite.create({
      data: {
        workspaceId,
        email: normalizedEmail,
        role,
        tokenHash,
        invitedById,
        expiresAt,
      },
    });

    this.logger.log(
      `Creating email invite workspace=${workspaceId} role=${role} invitedBy=${invitedById}`,
    );

    const registerUrl = this.mail.appUrl(
      `/register?invite=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`,
    );
    const sent = await this.mail.send({
      to: normalizedEmail,
      subject: `You're invited to ${workspaceName} on ApproveFlow`,
      text: `You were invited to join "${workspaceName}" as ${role}.\n\nCreate your account or sign in, then open:\n${registerUrl}`,
    });

    if (sent) {
      this.logger.log(
        `Invite email sent workspace=${workspaceId} role=${role}`,
      );
    } else {
      this.logger.warn(
        `Invite created without email workspace=${workspaceId} role=${role}`,
      );
    }

    const message = sent
      ? 'Invite email sent.'
      : 'Invite created, but email could not be sent. Share the registration link with the invitee.';

    // Expose token when SMTP failed (inviter must share the link) or in non-prod/debug.
    const exposeToken =
      !sent ||
      ENV.NODE_ENV !== 'production' ||
      ENV.EXPOSE_DEBUG_TOKENS;

    if (exposeToken) {
      return { status: 'pending', message, inviteToken: rawToken };
    }

    return { status: 'pending', message };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
