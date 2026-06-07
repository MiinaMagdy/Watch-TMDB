import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaService } from '../prisma.service';
import { MovieModule } from 'src/movie/movie.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [MovieModule, CacheModule.register({
    ttl: 5 * 60 * 1000
  })],
  controllers: [UserController],
  providers: [UserService, PrismaService],
  exports: [UserService],
})
export class UserModule { }
