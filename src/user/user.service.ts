import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { UserCredentialDto } from './dto/UserCredential.dto';
import { Prisma } from '@prisma/client';
import { UserSearchDto } from './dto/UserSearch.dto';
import { MovieService } from '../movie/movie.service';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private movieService: MovieService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) { }

  async create({ email, password }: UserCredentialDto) {
    const hashedPassword = await bcrypt.hash(password, 10);
    await this.prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
      },
    });
  }

  async findOne(dto: UserSearchDto) {
    const where: Prisma.UserWhereInput = {};
    if (dto.id) {
      where.id = dto.id;
    }
    if (dto.email) {
      where.email = dto.email;
    }
    return await this.prisma.user.findFirst({ where });
  }

  async getWatchlist(userId: number) {
    const cached = await this.cacheManager.get(`watchlist:${userId}`);
    if (cached) {
      return cached;
    }
    const watchlist = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        watchlist: true
      }
    })
    if (watchlist) {
      await this.cacheManager.set(`watchlist:${userId}`, watchlist);
    }
    else {
      throw new NotFoundException(`Watchlist not found for user with id: ${userId}`)
    }
    return watchlist;
  }

  async addToWatchlist(userId: number, tmdbId: number) {
    const movie = await this.movieService.findOne(tmdbId);
    if (!movie) {
      throw new NotFoundException(`Movie with tmdbId: ${tmdbId} not found`);
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        watchlist: true
      }
    });
    if (user && user.watchlist.find((movie) => movie.tmdbId === tmdbId)) {
      throw new ConflictException(`Movie with tmdbId: ${tmdbId} is already in the user's watchlist`);
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        watchlist: {
          connect: { tmdbId }
        }
      }
    })
    await this.cacheManager.del(`watchlist:${userId}`);
  }

  async removeFromWatchlist(userId: number, tmdbId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        watchlist: true
      }
    });
    if (user && user.watchlist.find((movie) => movie.tmdbId === tmdbId)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          watchlist: {
            disconnect: { tmdbId }
          }
        }
      });
    } else {
      throw new NotFoundException(`Movie with tmdbId: ${tmdbId} is not in the user's watchlist`);
    }
    await this.cacheManager.del(`watchlist:${userId}`);
  }
}
