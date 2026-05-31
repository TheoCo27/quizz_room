// backend/src/modules/rooms/rooms.module.ts
import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [RoomsService], 
  exports: [RoomsService],
})
export class RoomsModule {}