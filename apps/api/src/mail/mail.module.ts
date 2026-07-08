import { Global, Module } from '@nestjs/common';
import { EmailOutboxService } from './email-outbox.service.js';
import { MailService } from './mail.service.js';

@Global()
@Module({
  providers: [MailService, EmailOutboxService],
  exports: [MailService, EmailOutboxService],
})
export class MailModule {}
