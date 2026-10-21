import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MigrationEntity } from './entities/migration.entity';
import { MigrationService } from './services/migration.service';
import { MigrationController } from './controllers/migration.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MigrationEntity])],
  controllers: [MigrationController],
  providers: [MigrationService],
  exports: [MigrationService],
})
export class MigrationModule {}
