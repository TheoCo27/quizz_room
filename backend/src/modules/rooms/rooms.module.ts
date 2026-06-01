import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RoomsGateway } from './rooms.gateway';
import { AuthModule } from '../auth/auth.module';
import { RoomsController } from './rooms.controller';
import { QuizGameService } from './quiz-game.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RoomsController],
  providers: [RoomsService, RoomsGateway, QuizGameService],
  exports: [RoomsService],
})
export class RoomsModule {}

