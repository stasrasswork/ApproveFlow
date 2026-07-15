import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { hash } from 'argon2';
import { WorkspaceRole } from '../generated/prisma/client.js';
import type { WorkspaceInvitesService } from '../invites/workspace-invites.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { AuthTokenService } from './auth-token.service.js';
import { AuthService } from './auth.service.js';
import type { PasswordResetService } from './password-reset.service.js';

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
  };
  let tokens: {
    signTokens: jest.Mock;
    refresh: jest.Mock;
    revokeUserTokens: jest.Mock;
  };
  let passwordReset: {
    forgotPassword: jest.Mock;
    resetPassword: jest.Mock;
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
    tokenVersion: 0,
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
    };
    tokens = {
      signTokens: jest.fn().mockResolvedValue({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      }),
      refresh: jest.fn().mockResolvedValue({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      }),
      revokeUserTokens: jest.fn().mockResolvedValue(undefined),
    };
    passwordReset = {
      forgotPassword: jest.fn().mockResolvedValue({
        message: 'If an account exists for this email, a reset link has been sent.',
      }),
      resetPassword: jest.fn().mockResolvedValue({
        message: 'Password updated. You can sign in now.',
      }),
    };
    workspaceInvites = {
      acceptInviteToken: jest.fn().mockResolvedValue(undefined),
      acceptPendingInvitesForEmail: jest.fn().mockResolvedValue(0),
    };

    service = new AuthService(
      prisma as unknown as PrismaService,
      tokens as unknown as AuthTokenService,
      passwordReset as unknown as PasswordResetService,
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
      expect(tokens.signTokens).toHaveBeenCalledWith('user-1', 0);
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
    it('delegates to password reset service', async () => {
      await expect(
        service.forgotPassword({ email: 'missing@example.com' }),
      ).resolves.toEqual({
        message: expect.stringContaining('If an account exists'),
      });
      expect(passwordReset.forgotPassword).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('delegates to password reset service', async () => {
      await expect(service.resetPassword({
        token: 'valid-token',
        password: 'new-password',
      })).resolves.toEqual({
        message: 'Password updated. You can sign in now.',
      });
      expect(passwordReset.resetPassword).toHaveBeenCalledWith(
        'valid-token',
        'new-password',
      );
    });
  });

  describe('refresh', () => {
    it('delegates refresh token validation', async () => {
      await expect(
        service.refresh('refresh-token'),
      ).resolves.toEqual({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      });
      expect(tokens.refresh).toHaveBeenCalledWith('refresh-token');
    });
  });
});
