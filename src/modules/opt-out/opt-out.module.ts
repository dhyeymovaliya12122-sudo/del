import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OptOutEntity } from './entities/opt-out.entity';
import { OptOutService } from './services/opt-out.service';
import { OptOutController } from './controllers/opt-out.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OptOutEntity])],
  controllers: [OptOutController],
  providers: [OptOutService],
  exports: [OptOutService],
})
export class OptOutModule {}
