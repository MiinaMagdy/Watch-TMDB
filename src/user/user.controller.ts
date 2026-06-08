import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { UserTokenPayload } from '../auth/dto/UserTokenPayload.dto';
import { MovieIdDto } from '../movie/dto/MovieId.dto';

@ApiTags('Users')
@Controller('users')
export class UserController {
    constructor(private userService: UserService) { }

    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @Get('watchlist')
    async getUserWatchlist(@CurrentUser() user: UserTokenPayload) {
        return this.userService.getWatchlist(user.id);
    }

    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.CREATED)
    @Post('watchlist')
    async addToWatchlist(@CurrentUser() user: UserTokenPayload, @Body() dto: MovieIdDto) {
        return this.userService.addToWatchlist(user.id, dto.movieId)
    }

    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete('watchlist')
    async removeFromWatchlist(@CurrentUser() user: UserTokenPayload, @Body() dto: MovieIdDto) {
        return this.userService.removeFromWatchlist(user.id, dto.movieId)
    }
}
