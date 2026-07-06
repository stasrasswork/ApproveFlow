import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'argon2';
import { WorkspaceRole } from '../generated/prisma/client.js';
import type { WorkspaceInvitesService } from '../invites/workspace-invites.service.js';
import type { MailService } from '../mail/mail.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

const TEST_PASSWORD = 'secret-password';

describe('AuthService', () => {
  let passwordHash: string;
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    passwordResetToken: {
      deleteMany: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
    verifyAsync: jest.Mock;
  };
  let mail: {
    appUrl: jest.Mock;
    send: jest.Mock;
  };
  let workspaceInvites: {
    acceptInviteToken: jest.Mock;
    acceptPendingInvitesForEmail: jest.Mock;
  };

  const testUser = {
    id: 'user-1',
    email: 'alice@example.com',
    name: 'Alice',
    passwordHash: '',
  };

  beforeAll(async () => {
    passwordHash = await hash(TEST_PASSWORD);
    testUser.passwordHash = passwordHash;
  });

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      passwordResetToken: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    jwtService = {
      signAsync: jest.fn(async (payload: { typ: string }) =>
        payload.typ === 'refresh' ? 'refresh-token' : 'access-token',
      ),
      verifyAsync: jest.fn(),
    };
    mail = {
      appUrl: jest.fn((path: string) => `http://app.test${path}`),
      send: jest.fn().mockResolvedValue(false),
    };
    workspaceInvites = {
      acceptInviteToken: jest.fn().mockResolvedValue(undefined),
      acceptPendingInvitesForEmail: jest.fn().mockResolvedValue(0),
    };

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      mail as unknown as MailService,
      workspaceInvites as unknown as WorkspaceInvitesService,
    );
  });

  describe('login', () => {
    it('returns tokens for valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(testUser);

      await expect(
        service.login({ email: 'alice@example.com', password: TEST_PASSWORD }),
      ).resolves.toEqual({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      });
    });

    it('throws when user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'missing@example.com', password: TEST_PASSWORD }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws when password is invalid', async () => {
      prisma.user.findUnique.mockResolvedValue(testUser);

      await expect(
        service.login({ email: 'alice@example.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('creates user and returns safe payload', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(testUser);

      await expect(
        service.register({
          email: 'alice@example.com',
          password: TEST_PASSWORD,
          name: 'Alice',
        }),
      ).resolves.toMatchObject({
        id: 'user-1',
        email: 'alice@example.com',
        name: 'Alice',
        message: expect.stringContaining('Account created'),
      });
    });

    it('throws when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(testUser);

      await expect(
        service.register({
          email: 'alice@example.com',
          password: TEST_PASSWORD,
          name: 'Alice',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('accepts invite token after registration', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(testUser);

      const result = await service.register({
        email: 'alice@example.com',
        password: TEST_PASSWORD,
        name: 'Alice',
        inviteToken: 'invite-token',
      });

      expect(workspaceInvites.acceptInviteToken).toHaveBeenCalledWith(
        'invite-token',
        'user-1',
      );
      expect(result.message).toContain('invite accepted');
    });
  });

  describe('acceptInvite', () => {
    it('accepts token and returns user profile', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...testUser,
        workspaceMemberships: [
          {
            role: WorkspaceRole.ADMIN,
            workspace: { id: 'ws-1', name: 'Agency', slug: 'agency' },
          },
        ],
      });

      const result = await service.acceptInvite('user-1', 'invite-token');

      expect(workspaceInvites.acceptInviteToken).toHaveBeenCalledWith(
        'invite-token',
        'user-1',
      );
      expect(result.workspaces).toHaveLength(1);
      expect(result.workspaces[0]?.slug).toBe('agency');
    });
  });

  describe('updateProfile', () => {
    it('updates display name and returns profile', async () => {
      prisma.user.update.mockResolvedValue(testUser);
      prisma.user.findUnique.mockResolvedValue({
        ...testUser,
        name: 'Alice Updated',
        workspaceMemberships: [],
      });

      const result = await service.updateProfile('user-1', 'Alice Updated');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'Alice Updated' },
      });
      expect(result.name).toBe('Alice Updated');
    });
  });

  describe('forgotPassword', () => {
    it('returns generic message when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.forgotPassword({ email: 'missing@example.com' }),
      ).resolves.toEqual({
        message: expect.stringContaining('If an account exists'),
      });

      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('creates reset token and returns dev token when mail is not sent', async () => {
      prisma.user.findUnique.mockResolvedValue(testUser);

      const result = await service.forgotPassword({ email: testUser.email });

      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: testUser.id },
      });
      expect(prisma.passwordResetToken.create).toHaveBeenCalled();
      expect(mail.send).toHaveBeenCalled();
      expect(result.resetToken).toEqual(expect.any(String));
    });
  });

  describe('resetPassword', () => {
    it('throws for invalid token', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'bad-token', password: 'new-pass' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws for expired token', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        userId: testUser.id,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.resetPassword({ token: 'expired-token', password: 'new-pass' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('updates password and clears tokens', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        userId: testUser.id,
        expiresAt: new Date(Date.now() + 60_000),
      });

      const result = await service.resetPassword({
        token: 'valid-token',
        password: 'new-password',
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.message).toContain('Password updated');
    });
  });

  describe('refresh', () => {
    it('throws when token verification fails', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));

      await expect(
        service.refresh({ refresh_token: 'bad' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws when token type is not refresh', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', typ: 'access' });

      await expect(
        service.refresh({ refresh_token: 'access-as-refresh' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws when user no longer exists', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        typ: 'refresh',
      });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.refresh({ refresh_token: 'refresh-token' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns new tokens for valid refresh token', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        typ: 'refresh',
      });
      prisma.user.findUnique.mockResolvedValue(testUser);

      await expect(
        service.refresh({ refresh_token: 'refresh-token' }),
      ).resolves.toEqual({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      });
    });
  });
});
