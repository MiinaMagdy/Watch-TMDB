import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(config: ConfigService) {
    const adapter = new PrismaMariaDb({
      host: config.get<string>("DATABASE_HOST"),
      port: parseInt(config.get<string>("DATABASE_PORT") || '3306'),
      database: config.get<string>("DATABASE_NAME"),
      user: config.get<string>("DATABASE_USER"),
      password: config.get<string>("DATABASE_PASSWORD"),
    });

    super({ adapter });
  }
}
