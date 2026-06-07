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
    update: jest.fn(),
  },
  genre: {
    upsert: jest.fn(),
  },
  rating: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrismaService)),
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
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
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
    const genres = [
      { id: 1, name: "Action" },
      { id: 2, name: "Comedy" },
      { id: 3, name: "Drama" }
    ]
    mockConfigService.get.mockReturnValue("some_key");
    mockPrismaService.movie.findMany.mockResolvedValue([])
    mockHttpService.axiosRef.get.mockResolvedValueOnce({ data: { genres } })
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
    expect(mockHttpService.axiosRef.get).toHaveBeenCalledTimes(1 + pages);
    expect(mockPrismaService.genre.upsert).toHaveBeenCalledTimes(genres.length);
    expect(mockPrismaService.movie.upsert).toHaveBeenCalledTimes(pages * 20);
    expect(mockCacheManager.clear).toHaveBeenCalledTimes(1);
  })

  it('should delta sync the database from TMDB for a single day', async () => {
    const total_pages = 3;
    const moviesPerPage = 20;
    const moviesInDB = 30;
    mockConfigService.get.mockReturnValue("some_key");

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
      language: "en"
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

  it('should find many movies and cache miss', async () => {
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
    }))
    mockCacheManager.get.mockResolvedValue(null);
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
    expect(mockCacheManager.set).toHaveBeenCalledTimes(1);
    expect(mockCacheManager.set).toHaveBeenCalledWith(`movies:${JSON.stringify({ limit, page })}`, { movies, total, page, limit });
  })

  it('should find many movies and cache hit', async () => {
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
    }))
    mockCacheManager.get.mockResolvedValue({ movies, total: moviesInDB, page, limit });
    const { movies: foundMovies, total, page: foundPage, limit: foundLimit } = await service.findAll({ limit, page });
    expect(foundMovies).toEqual(movies);
    expect(total).toEqual(moviesInDB);
    expect(foundPage).toEqual(page);
    expect(foundLimit).toEqual(limit);
    expect(mockPrismaService.movie.findMany).toHaveBeenCalledTimes(0);
    expect(mockPrismaService.movie.count).toHaveBeenCalledTimes(0);
    expect(mockCacheManager.get).toHaveBeenCalledTimes(1);
    expect(mockCacheManager.set).toHaveBeenCalledTimes(0);
  })

  it('should find many movies with minimum rating', async () => {
    const moviesInDB = 100;
    const limit = 20;
    const page = 1;
    const minRating = 7;
    const movies = Array.from({ length: limit }, (_, i) => ({
      tmdbId: (page - 1) * limit + i + 1,
      title: `Movie ${i + 1}`,
      overview: `Overview ${i + 1}`,
      releaseDate: `2022-01-01`,
      posterPath: `/poster-${i + 1}.jpg`,
      backdropPath: `/backdrop-${i + 1}.jpg`,
      popularity: 100,
      voteAverage: i % 10 + 1,
      voteCount: 1000,
      adult: false,
      language: "en",
    }))
    mockCacheManager.get.mockResolvedValue(null);
    mockPrismaService.movie.findMany.mockResolvedValue(movies.filter(m => m.voteAverage >= minRating))
    mockPrismaService.movie.count.mockResolvedValue(moviesInDB)
    const { limit: foundLimit, movies: foundMovies, page: foundPage, total } = await service.findAll({ limit, page, minRating });
    expect(foundMovies.length).toEqual(8);
    expect(total).toEqual(moviesInDB);
    expect(foundPage).toEqual(page);
    expect(foundLimit).toEqual(limit);
    expect(mockPrismaService.movie.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrismaService.movie.findMany).toHaveBeenCalledWith({ where: { totalVoteAverage: { gte: minRating } }, skip: (page - 1) * limit, take: limit, orderBy: { popularity: 'desc' } });
    expect(mockCacheManager.set).toHaveBeenCalledTimes(1);
    expect(mockCacheManager.set).toHaveBeenCalledWith(`movies:${JSON.stringify({ limit, page, minRating })}`, { movies: foundMovies, total, page, limit });
  })

  it('should find one movie and cache miss', async () => {
    const id = 1;
    mockCacheManager.get.mockResolvedValue(null);
    mockPrismaService.movie.findUnique.mockResolvedValue({
      tmdbId: id,
      title: `Movie ${id}`,
      overview: `Overview ${id}`,
      releaseDate: `2022-01-01`,
      posterPath: `/poster-${id}.jpg`,
      backdropPath: `/backdrop-${id}.jpg`,
      popularity: 100,
      voteAverage: 8,
      voteCount: 1000,
      adult: false,
      language: "en",
    })
    const movie = await service.findOne(id);
    expect(movie).toEqual({
      tmdbId: id,
      title: `Movie ${id}`,
      overview: `Overview ${id}`,
      releaseDate: `2022-01-01`,
      posterPath: `/poster-${id}.jpg`,
      backdropPath: `/backdrop-${id}.jpg`,
      popularity: 100,
      voteAverage: 8,
      voteCount: 1000,
      adult: false,
      language: "en",
    })
    expect(mockPrismaService.movie.findUnique).toHaveBeenCalledTimes(1);
    expect(mockPrismaService.movie.findUnique).toHaveBeenCalledWith({ where: { tmdbId: id } });
    expect(mockCacheManager.set).toHaveBeenCalledTimes(1);
    expect(mockCacheManager.set).toHaveBeenCalledWith(`movie:${id}`, {
      tmdbId: id,
      title: `Movie ${id}`,
      overview: `Overview ${id}`,
      releaseDate: `2022-01-01`,
      posterPath: `/poster-${id}.jpg`,
      backdropPath: `/backdrop-${id}.jpg`,
      popularity: 100,
      voteAverage: 8,
      voteCount: 1000,
      adult: false,
      language: "en",
    });
  })

  it('should find one movie and cache hit', async () => {
    const id = 1;
    mockCacheManager.get.mockResolvedValue({
      tmdbId: id,
      title: `Movie ${id}`,
      overview: `Overview ${id}`,
      releaseDate: `2022-01-01`,
      posterPath: `/poster-${id}.jpg`,
      backdropPath: `/backdrop-${id}.jpg`,
      popularity: 100,
      voteAverage: 8,
      voteCount: 1000,
      adult: false,
      language: "en",
    })
    const movie = await service.findOne(id);
    expect(movie).toEqual({
      tmdbId: id,
      title: `Movie ${id}`,
      overview: `Overview ${id}`,
      releaseDate: `2022-01-01`,
      posterPath: `/poster-${id}.jpg`,
      backdropPath: `/backdrop-${id}.jpg`,
      popularity: 100,
      voteAverage: 8,
      voteCount: 1000,
      adult: false,
      language: "en",
    })
    expect(mockPrismaService.movie.findUnique).toHaveBeenCalledTimes(0);
    expect(mockCacheManager.get).toHaveBeenCalledTimes(1);
    expect(mockCacheManager.set).toHaveBeenCalledTimes(0);
  })

  it('should add new non-existing rating and udpate average', async () => {
    const movie = {
      id: 1,
      tmdbId: 1,
      voteAverage: 10,
      voteCount: 1,
      localVoteAverage: 2,
      localVoteCount: 1,
      totalVoteAverage: 6,
      totalVoteCount: 2,
    };
    const userId = 1;
    const rating = 3;
    mockCacheManager.get.mockResolvedValue(null);
    mockPrismaService.movie.findUnique.mockResolvedValue(movie);
    mockPrismaService.rating.findUnique.mockResolvedValue(null);
    mockCacheManager.del.mockResolvedValue(true);

    await service.rateMovie(movie.tmdbId, userId, rating);
    expect(mockCacheManager.set).toHaveBeenCalledWith(`movie:${movie.tmdbId}`, movie)
    expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrismaService.rating.upsert).toHaveBeenCalledWith({
      where: { userId_movieId: { userId, movieId: movie.id } },
      update: { value: rating },
      create: { userId, movieId: movie.id, value: rating }
    })
    expect(mockPrismaService.movie.update).toHaveBeenCalledWith({
      where: { tmdbId: movie.tmdbId },
      data: {
        localVoteAverage: 2.5,
        localVoteCount: 2,
        totalVoteAverage: 5,
        totalVoteCount: 3,
      }
    })
    expect(mockCacheManager.del).toHaveBeenCalledWith(`movie:${movie.tmdbId}`);
  })

  it('should update existing rating and recalculate average', async () => {
    const movie = {
      id: 1,
      tmdbId: 1,
      voteAverage: 10,
      voteCount: 1,
      localVoteAverage: 2,
      localVoteCount: 1,
      totalVoteAverage: 6,
      totalVoteCount: 2,
    };
    const userId = 1;
    const rating = 3;
    mockCacheManager.get.mockResolvedValue(null);
    mockPrismaService.movie.findUnique.mockResolvedValue(movie);
    mockPrismaService.rating.findUnique.mockResolvedValue({ value: 2 });
    mockCacheManager.del.mockResolvedValue(true);

    await service.rateMovie(movie.tmdbId, userId, rating);
    expect(mockCacheManager.set).toHaveBeenCalledWith(`movie:${movie.tmdbId}`, movie)
    expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrismaService.rating.upsert).toHaveBeenCalledWith({
      where: { userId_movieId: { userId, movieId: movie.id } },
      update: { value: rating },
      create: { userId, movieId: movie.id, value: rating }
    })
    expect(mockPrismaService.movie.update).toHaveBeenCalledWith({
      where: { tmdbId: movie.tmdbId },
      data: {
        localVoteAverage: 3,
        localVoteCount: 1,
        totalVoteAverage: 6.5,
        totalVoteCount: 2,
      }
    })
    expect(mockCacheManager.del).toHaveBeenCalledWith(`movie:${movie.tmdbId}`);
  })

  it('should not remove rating and throw not found erorr', async () => {
    const movie = {
      id: 1,
      tmdbId: 1,
      voteAverage: 10,
      voteCount: 1,
      localVoteAverage: 2,
      localVoteCount: 1,
      totalVoteAverage: 6,
      totalVoteCount: 2,
    };
    const userId = 1;
    mockCacheManager.get.mockResolvedValue(null);
    mockPrismaService.movie.findUnique.mockResolvedValue(movie);
    mockPrismaService.rating.findUnique.mockResolvedValue(null);
    await expect(service.removeRate(movie.tmdbId, userId)).rejects.toThrow('Rating not found');
    expect(mockPrismaService.rating.delete).toHaveBeenCalledTimes(0);
    expect(mockCacheManager.del).toHaveBeenCalledTimes(0);
  })

  it('should remove exisiting rating', async () => {
    const movie = {
      id: 1,
      tmdbId: 1,
      voteAverage: 10,
      voteCount: 1,
      localVoteAverage: 2,
      localVoteCount: 1,
      totalVoteAverage: 6,
      totalVoteCount: 2,
    };
    const userId = 1;
    mockCacheManager.get.mockResolvedValue(null);
    mockPrismaService.movie.findUnique.mockResolvedValue(movie);
    mockPrismaService.rating.findUnique.mockResolvedValue({ value: 2 });
    mockCacheManager.del.mockResolvedValue(true);

    await service.removeRate(movie.tmdbId, userId);
    expect(mockCacheManager.set).toHaveBeenCalledWith(`movie:${movie.tmdbId}`, movie)
    expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrismaService.rating.delete).toHaveBeenCalledWith({
      where: { userId_movieId: { userId, movieId: movie.id } }
    })
    expect(mockPrismaService.movie.update).toHaveBeenCalledWith({
      where: { tmdbId: movie.tmdbId },
      data: {
        localVoteAverage: 0,
        localVoteCount: 0,
        totalVoteAverage: 10,
        totalVoteCount: 1,
      }
    })
    expect(mockCacheManager.del).toHaveBeenCalledWith(`movie:${movie.tmdbId}`);
  })
});
