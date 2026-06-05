import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { UserCredentialDto } from './dto/UserCredential.dto';
import { UserWhereInput } from 'src/generated/prisma/models';
import { UserSearchDto } from './dto/UserSearch.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) { }

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
    const where: UserWhereInput = {};
    if (dto.id) {
      where.id = dto.id;
    }
    if (dto.email) {
      where.email = dto.email;
    }
    return await this.prisma.user.findFirst({ where });
  }
}
