// Ce fichier declare le module racine NestJS et assemble tous les modules
// fonctionnels du projet.
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { AppController } from "./app.controller";
import { AppService } from "./app.service";

import { AuthModule } from "./modules/auth/auth.module";
import { QuizzesModule } from "./modules/quizzes/quizzes.module";
import { ScoresModule } from "./modules/scores/scores.module";
import { UsersModule } from "./modules/users/users.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RoomsModule } from './modules/rooms/rooms.module';

import { MetricsModule } from './modules/metrics/metrics.module';
import { MetricsMiddleware } from './modules/metrics/metrics.middleware';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 30000,
      limit: 10,
    }]),
    AuthModule,
    UsersModule,
    PrismaModule,
    QuizzesModule,
    ScoresModule,
    RoomsModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MetricsMiddleware).forRoutes('*');
  }
}