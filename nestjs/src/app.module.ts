import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController, BookingController],
  providers: [PrismaService, AppService, RedisService, BookingService],
})
export class AppModule {}
