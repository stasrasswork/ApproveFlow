import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { CsrfGuard } from './auth/csrf.guard.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { createThrottlerOptions } from './config/throttler.config.js';
import { HealthModule } from './health/health.module.js';
import { InvitesModule } from './invites/invites.module.js';
import { MailModule } from './mail/mail.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { WorkspacesModule } from './workspaces/workspaces.module.js';

@Module({
  imports: [
    ThrottlerModule.forRoot(createThrottlerOptions()),
    PrismaModule,
    MailModule,
    InvitesModule,
    NotificationsModule,
    HealthModule,
    AuthModule,
    TasksModule,
    ProjectsModule,
    WorkspacesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule {}
