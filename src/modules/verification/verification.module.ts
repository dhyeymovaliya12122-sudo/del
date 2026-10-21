import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationEntity } from './entities/verification.entity';
import { VerificationService } from './services/verification.service';
import { VerificationController } from './controllers/verification.controller';

@Module({
  imports: [TypeOrmModule.forFeature([VerificationEntity])],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
