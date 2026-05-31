import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RoomsGateway } from './rooms.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [RoomsService, RoomsGateway],
  exports: [RoomsService],
})
export class RoomsModule {}
