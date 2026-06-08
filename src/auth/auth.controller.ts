import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UserCredentialDto } from '../user/dto/UserCredential.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() dto: UserCredentialDto) {
        await this.authService.register(dto);
        return { message: "User registered successfully!" };
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: UserCredentialDto) {
        const result = await this.authService.login(dto);
        return result;
    }
}
