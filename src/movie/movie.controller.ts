import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { MovieQueryDto } from './dto/MovieQuery.dto';
import { MovieService } from './movie.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { UserTokenPayload } from '../auth/dto/UserTokenPayload.dto';
import { RateMovieDto } from './dto/RateMovie.dto';

@Controller('movies')
export class MovieController {
    constructor(private movieService: MovieService) { }
    @Get()
    async findAll(@Query() query: MovieQueryDto) {
        return this.movieService.findAll(query);
    }

    @Get('genres')
    async findAllGenres() {
        return this.movieService.findAllGenres();
    }

    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return this.movieService.findOne(id);
    }

    @Post('seed')
    async seedMovies(@Query() query: { pages?: string }) {
        return this.movieService.seedMovies(parseInt(query.pages || '5'));
    }

    @Post('sync')
    async deltaSync() {
        return this.movieService.deltaSync();
    }

    @UseGuards(JwtAuthGuard)
    @Put(':id/rate')
    @HttpCode(HttpStatus.CREATED)
    async addRateToMovie(@Param('id', ParseIntPipe) movieId: number, @CurrentUser() user: UserTokenPayload, @Body() dto: RateMovieDto) {
        return this.movieService.rateMovie(movieId, user.id, dto.rating);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id/rate')
    @HttpCode(HttpStatus.NO_CONTENT)
    async removeRateFromMovie(@Param('id', ParseIntPipe) movieId: number, @CurrentUser() user: UserTokenPayload) {
        return this.movieService.removeRate(movieId, user.id);
    }


}
