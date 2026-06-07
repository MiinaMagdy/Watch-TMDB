import { Controller, Get, Param, ParseIntPipe, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { MovieQueryDto } from './dto/MovieQuery.dto';
import { MovieService } from './movie.service';

@Controller('movies')
export class MovieController {
    constructor(private movieService: MovieService) { }
    @Get()
    async findAll(@Query() query: MovieQueryDto) {
        return this.movieService.findAll(query);
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

}
