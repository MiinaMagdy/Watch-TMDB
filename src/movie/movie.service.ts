import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { TmdbMovie } from './dto/TmdbMovie.dto';
import { TmdbResource } from './dto/TmdbResource.dto';
import { MovieQueryDto } from './dto/MovieQuery.dto';
import { MovieWhereInput } from 'src/generated/prisma/models';
import { Cron } from '@nestjs/schedule';
import { Genre } from './dto/Genre.dto';
import { Movie } from '../generated/prisma/client';

@Injectable()
export class MovieService {

    private readonly logger = new Logger(MovieService.name);

    constructor(
        private prismaService: PrismaService,
        private httpService: HttpService,
        private configService: ConfigService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    private mapMovie(movie: TmdbMovie) {
        return {
            tmdbId: movie.id,
            title: movie.title,
            overview: movie.overview,
            releaseDate: movie.release_date,
            posterPath: movie.poster_path,
            backdropPath: movie.backdrop_path,
            popularity: movie.popularity,
            voteAverage: movie.vote_average,
            voteCount: movie.vote_count,
            adult: movie.adult,
            language: movie.original_language,
        }
    }

    private async fetchFromTMDB(endpoint: string, params?: { [key: string]: string }) {
        const baseURL = this.configService.get<string>('TMDB_BASE_URL');
        const token = this.configService.get<string>('TMDB_READ_ACCESS_TOKEN');

        const { data } = await this.httpService.axiosRef.get(
            `${baseURL}/${endpoint}`,
            { params, headers: { Authorization: `Bearer ${token}` } }
        );
        return data;
    }

    private async fetchChangedIds(resource: TmdbResource, page: number, start_date: string, end_date: string) {
        return this.fetchFromTMDB(`${resource}/changes`, { page: page.toString(), start_date, end_date });
    }

    private async fetchMoviesChangedIds(startDate: string, endDate: string) {
        const changedIds: number[] = [];
        const { total_pages } = await this.fetchChangedIds('movie', 1, startDate, endDate);

        for (let page = 1; page <= total_pages; page++) {
            const { results } = await this.fetchChangedIds('movie', page, startDate, endDate);
            changedIds.push(...((results as { id: number }[]).map(r => r.id)));
        }
        return changedIds;
    }

    private async fetchMovieDetail(id: number) {
        return this.fetchFromTMDB(`movie/${id}`);
    }

    private async upsertMovies(movies: TmdbMovie[]) {
        const tmdbIds = movies.map(m => m.id);
        const existingMovies = await this.prismaService.movie.findMany({
            where: { tmdbId: { in: tmdbIds } },
            select: { tmdbId: true, localVoteAverage: true, localVoteCount: true },
        });
        const existingMoviesMap = new Map(existingMovies.map(m => [m.tmdbId, m]));
        await Promise.all(
            movies.map(m => {
                const movie = this.mapMovie(m);
                const existing = existingMoviesMap.get(movie.tmdbId);
                const totalVoteCount = (existing?.localVoteCount ?? 0) + movie.voteCount;
                const totalVoteAverage = totalVoteCount === 0 ? 0 : ((existing?.localVoteAverage ?? 0) * (existing?.localVoteCount ?? 0) + movie.voteAverage * movie.voteCount) / totalVoteCount;
                const genreConnections = (m.genre_ids ?? []).map(id => ({ tmdbId: id }));
                return this.prismaService.movie.upsert({
                    where: { tmdbId: movie.tmdbId },
                    update: { ...movie, totalVoteAverage, totalVoteCount, genres: { set: genreConnections } },
                    create: { ...movie, totalVoteAverage, totalVoteCount, genres: { connect: genreConnections } }
                });
            })
        );
    }

    private async upsertGenres(genres: Genre[]) {
        for (const genre of genres) {
            await this.prismaService.genre.upsert({
                where: { tmdbId: genre.id },
                update: {
                    name: genre.name,
                },
                create: {
                    tmdbId: genre.id,
                    name: genre.name
                },
            });
        }
    }

    private async syncGenres() {
        const { genres }: { genres: Genre[] } = await this.fetchFromTMDB('genre/movie/list');
        await this.upsertGenres(genres);
        this.logger.log(`Synced ${genres.length} genres`);
    }

    async seedMovies(pages = 5) {
        await this.syncGenres();
        let seeded = 0;
        for (let page = 1; page <= pages; page++) {
            const { results } = await this.fetchFromTMDB('movie/popular', { page: page.toString() })
            await this.upsertMovies(results);
            seeded += results.length;
        }
        await this.cacheManager.clear();
        return { seeded };
    }

    async deltaSync() {
        const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];

        // 1. Get all changed IDs from TMDB (paginated)
        const changedIds = await this.fetchMoviesChangedIds(yesterday, today);

        // 2. Cross-reference with our DB — only update movies we have
        const ourMovies = await this.prismaService.movie.findMany({
            where: { tmdbId: { in: changedIds } },
            select: { tmdbId: true },
        });
        const ourIds = ourMovies.map(m => m.tmdbId);

        // 3. Fetch full details and upsert each one
        const BATCH_SIZE = 5;
        const details: TmdbMovie[] = [];
        for (let i = 0; i < ourIds.length; i += BATCH_SIZE) {
            const batch = ourIds.slice(i, i + BATCH_SIZE);
            const batchDetails = await Promise.all(
                batch.map(id => this.fetchMovieDetail(id))
            );
            details.push(...batchDetails);
        }

        // Upsert all at once
        await this.upsertMovies(details);

        await this.cacheManager.clear();
        return { updated: ourIds.length };
    }

    async findAll(query: MovieQueryDto) {
        const cacheKey = `movies:${JSON.stringify(query)}`
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) return cached as { movies: Movie[], total: number, page: number, limit: number };

        const { page = 1, limit = 20, search = '', sortBy = 'popularity', genreIds, minRating } = query;
        const where: MovieWhereInput = {};
        if (search) {
            where.OR = [
                { title: { contains: search } },
                { overview: { contains: search } },
            ];
        }

        if (minRating) {
            where.totalVoteAverage = { gte: minRating };
        }

        if (genreIds) {
            const ids = genreIds.split(',').map(id => parseInt(id.trim()));
            where.AND = where.AND ?? [];
            const genreConditions = ids.map(id => ({ genres: { some: { tmdbId: id } } }));
            (where.AND as any[]).push(...genreConditions);
        }

        const orderBy = this.getOrderBy(sortBy);
        const [movies, total] = await Promise.all([
            this.prismaService.movie.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prismaService.movie.count({ where }),
        ]);
        const result = { movies, total, page, limit };

        await this.cacheManager.set(cacheKey, result);

        return result;
    }

    private getOrderBy(sortBy: MovieQueryDto['sortBy']): { [key: string]: 'asc' | 'desc' } {
        switch (sortBy) {
            case 'popularity':
                return { popularity: 'desc' };
            case 'voteAverage':
                return { voteAverage: 'desc' };
            case 'releaseDate':
                return { releaseDate: 'desc' };
            default:
                return { popularity: 'desc' };
        }
    }

    async findOne(id: number) {
        const cacheKey = `movie:${id}`
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) return cached;
        const movie = await this.prismaService.movie.findUnique({ where: { tmdbId: id } });
        if (!movie)
            throw new NotFoundException(`Movie with TMDB ID ${id} not found`);
        await this.cacheManager.set(cacheKey, movie);
        return movie;
    }

    // runs at 3 AM every day
    @Cron('0 3 * * *')
    async scheduleDeltaSync() {
        try {
            const result = await this.deltaSync();
            this.logger.log(`Scheduled delta sync completed: ${JSON.stringify(result)}`);
        } catch (error) {
            this.logger.error('Scheduled delta sync failed', error instanceof Error ? error.stack : String(error));
        }
    }
}
