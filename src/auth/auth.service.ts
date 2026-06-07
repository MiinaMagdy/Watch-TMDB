import {
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserCredentialDto } from '../user/dto/UserCredential.dto';
import { UserService } from '../user/user.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService,
        private userService: UserService,
    ) { }

    async register(dto: UserCredentialDto) {
        try {
            await this.userService.create(dto);
        } catch (error: unknown) {
            if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException("User already exists");
            }
            throw error;
        }
    }

    async login(dto: UserCredentialDto) {
        const foundUser = await this.userService.findOne({ email: dto.email });
        if (!foundUser) {
            throw new UnauthorizedException("Invalid credentials");
        }
        const isMatch = await bcrypt.compare(dto.password, foundUser.passwordHash);
        if (!isMatch) {
            throw new UnauthorizedException("Invalid credentials");
        }
        const payload = { id: foundUser.id, email: foundUser.email };
        const token = await this.jwtService.signAsync(payload);
        return { token };
    }
}
