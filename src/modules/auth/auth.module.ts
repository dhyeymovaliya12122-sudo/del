import { Module, Global, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppUserEntity } from './entities/app-user.entity';
import { PasswordResetEntity } from './entities/password-reset.entity';
import { UserAccountAccessEntity } from './entities/user-account-access.entity';
import { ScheduledMessageEntity } from './entities/scheduled-message.entity';
import { AutoReplyRuleEntity } from './entities/auto-reply-rule.entity';
import { SecurityAuditLogEntity } from './entities/security-audit-log.entity';
import { WhatsappAccountEntity } from '../session-hydration/entities/whatsapp-account.entity';
import { AuthService } from './services/auth.service';
import { SchedulerService } from './services/scheduler.service';
import { AutoReplyService } from './services/auto-reply.service';
import { SecurityAuditService } from '../../common/services/security-audit.service';
import { DisconnectionMonitorService } from './services/disconnection-monitor.service';
import { AuthController } from './controllers/auth.controller';
import { SchedulerController } from './controllers/scheduler.controller';
import { AutoReplyController } from './controllers/auto-reply.controller';
import { SessionHydrationModule } from '../session-hydration/session-hydration.module';
import { RealtimeGatewayModule } from '../realtime-gateway/realtime-gateway.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AppUserEntity,
      PasswordResetEntity,
      UserAccountAccessEntity,
      ScheduledMessageEntity,
      AutoReplyRuleEntity,
      SecurityAuditLogEntity,
      WhatsappAccountEntity,
    ]),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
        const isProd = (config.get<string>('NODE_ENV') || process.env.NODE_ENV) === 'production';
        const defaultSecret = '7c4a8d09ca3762af61e59520943dc26494f8941b47eb3e1e5d3a9c7b0f6e2d1a8b3f5c7e9d1a2b4c6e8f0a1b3d5e7f9a0c2d4e6f8b1d3e5a7c9f0b2d4e6a8c0';

        if (isProd && (!secret || secret === defaultSecret || secret.length < 32)) {
          throw new Error(
            '🚨 [SECURITY FATAL] Insecure, default, or weak JWT_SECRET detected in production! Please define a strong JWT_SECRET (minimum 32 characters) in your environment variables before starting the server.',
          );
        }

        return {
          secret: secret || defaultSecret,
          signOptions: { expiresIn: '7d' },
        };
      },
    }),
    forwardRef(() => SessionHydrationModule),
    forwardRef(() => RealtimeGatewayModule),
  ],
  controllers: [AuthController, SchedulerController, AutoReplyController],
  providers: [
    AuthService,
    SchedulerService,
    AutoReplyService,
    SecurityAuditService,
    DisconnectionMonitorService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    AuthService,
    AutoReplyService,
    SecurityAuditService,
    DisconnectionMonitorService,
    JwtModule,
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class AuthModule {}
