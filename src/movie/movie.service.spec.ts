import { Test, TestingModule } from '@nestjs/testing';
import { MovieService } from './movie.service';
import { PrismaService } from '../prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

const mockPrismaService = {
  movie: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
  }
};

const mockHttpService = {
  axiosRef: {
    get: jest.fn(),
  }
}

const mockConfigService = {
  get: jest.fn(),
}

const mockCacheManager = {
  clear: jest.fn(),
}

describe('MovieService', () => {
  let service: MovieService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovieService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        }
      ],
    }).compile();

    service = module.get<MovieService>(MovieService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  })

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should seed the database from TMDB', async () => {
    const pages = 4;
    mockConfigService.get.mockResolvedValue("some_key");
    mockHttpService.axiosRef.get.mockResolvedValue({
      data: {
        results: Array.from({ length: 20 }, (_, i) => ({
          id: i + 1,
          title: `Movie ${i + 1}`,
          overview: `Overview ${i + 1}`,
          release_date: `2022-01-01`,
          poster_path: `/poster-${i + 1}.jpg`,
          backdrop_path: `/backdrop-${i + 1}.jpg`,
          popularity: 100,
          vote_average: 8,
          vote_count: 1000,
          adult: false,
          original_language: "en",
          genre_ids: [1, 2, 3]
        }))
      }
    });

    const { seeded } = await service.seedMovies(pages);
    expect(seeded).toEqual(pages * 20);
    expect(mockHttpService.axiosRef.get).toHaveBeenCalledTimes(pages);
    expect(mockPrismaService.movie.upsert).toHaveBeenCalledTimes(pages * 20);
    expect(mockCacheManager.clear).toHaveBeenCalledTimes(1);
  })

  it('should delta sync the database from TMDB for a single day', async () => {
    const total_pages = 3;
    const moviesPerPage = 20;
    const moviesInDB = 30;
    mockConfigService.get.mockResolvedValue("some_key");

    mockHttpService.axiosRef.get.mockImplementation((endpoint: string, options: { params?: { page: string } }) => {
      const page = parseInt(options?.params?.page || "1");
      if (endpoint.includes('movie/changes') && page <= total_pages) {
        return {
          data: {
            results: Array.from({ length: moviesPerPage }, (_, i) => ({
              id: (page - 1) * moviesPerPage + i + 1,
              title: `Movie ${(page - 1) * moviesPerPage + i + 1}`,
              overview: `Overview ${(page - 1) * moviesPerPage + i + 1}`,
              release_date: `2022-01-01`,
              poster_path: `/poster-${(page - 1) * moviesPerPage + i + 1}.jpg`,
              backdrop_path: `/backdrop-${(page - 1) * moviesPerPage + i + 1}.jpg`,
              popularity: 100,
              vote_average: 8,
              vote_count: 1000,
              adult: false,
              original_language: "en",
              genre_ids: [1, 2, 3]
            })),
            page,
            total_pages
          }
        };
      }
      else if (endpoint.includes('movie/')) {
        const movieId = parseInt(endpoint.split('/')[1]);
        return {
          data: {
            id: movieId,
            title: `Movie ${movieId}`,
            overview: `Overview ${movieId}`,
            release_date: `2022-01-01`,
            poster_path: `/poster-${movieId}.jpg`,
            backdrop_path: `/backdrop-${movieId}.jpg`,
            popularity: 100,
            vote_average: 8,
            vote_count: 1000,
            adult: false,
            original_language: "en",
            genre_ids: [1, 2, 3]
          }
        };
      }
    });

    mockPrismaService.movie.findMany.mockResolvedValue(Array.from({ length: moviesInDB }, (_, i) => ({
      tmdbId: i + 1,
      title: `Movie ${i + 1}`,
      overview: `Overview ${i + 1}`,
      releaseDate: `2022-01-01`,
      posterPath: `/poster-${i + 1}.jpg`,
      backdropPath: `/backdrop-${i + 1}.jpg`,
      popularity: 100,
      voteAverage: 8,
      voteCount: 1000,
      adult: false,
      language: "en",
      genreIds: [1, 2, 3]
    })))

    const { updated } = await service.deltaSync();
    expect(updated).toEqual(moviesInDB);
    expect(mockHttpService.axiosRef.get).toHaveBeenCalledTimes(moviesInDB + (total_pages + 1));
    expect(mockConfigService.get).toHaveBeenCalledTimes(2 * (moviesInDB + total_pages + 1));
    expect(mockPrismaService.movie.findMany).toHaveBeenCalledWith({
      where: {
        tmdbId: { in: Array.from({ length: total_pages * moviesPerPage }, (_, i) => i + 1) }
      },
      select: {
        tmdbId: true
      }
    })
    expect(mockPrismaService.movie.upsert).toHaveBeenCalledTimes(moviesInDB);
    expect(mockCacheManager.clear).toHaveBeenCalledTimes(1);
  })

  it('should find many movies', async () => {
    const page = 2;
    const moviesInDB = 100;
    const limit = 40;
    const movies = Array.from({ length: limit }, (_, i) => ({
      tmdbId: (page - 1) * limit + i + 1,
      title: `Movie ${i + 1}`,
      overview: `Overview ${i + 1}`,
      releaseDate: `2022-01-01`,
      posterPath: `/poster-${i + 1}.jpg`,
      backdropPath: `/backdrop-${i + 1}.jpg`,
      popularity: 100,
      voteAverage: 8,
      voteCount: 1000,
      adult: false,
      language: "en",
      genreIds: [1, 2, 3]
    }))
    mockPrismaService.movie.findMany.mockResolvedValue(movies)
    mockPrismaService.movie.count.mockResolvedValue(moviesInDB)
    const { movies: foundMovies, total, page: foundPage, limit: foundLimit } = await service.findAll({ limit, page });
    expect(foundMovies).toEqual(movies);
    expect(total).toEqual(moviesInDB);
    expect(foundPage).toEqual(page);
    expect(foundLimit).toEqual(limit);
    expect(mockPrismaService.movie.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrismaService.movie.count).toHaveBeenCalledTimes(1);
    expect(mockPrismaService.movie.findMany).toHaveBeenCalledWith({ where: {}, skip: (page - 1) * limit, take: limit, orderBy: { popularity: 'desc' } });
  })
});
