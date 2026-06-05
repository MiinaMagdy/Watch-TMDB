import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MovieService } from './movie.service';
import { MovieController } from './movie.controller';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [HttpModule, CacheModule.register({
    ttl: 5 * 60 * 1000
  })],
  providers: [MovieService, PrismaService],
  controllers: [MovieController],
})
export class MovieModule { }
