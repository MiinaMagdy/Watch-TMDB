import { Test, TestingModule } from '@nestjs/testing';
import { MovieController } from './movie.controller';
import { MovieService } from './movie.service';

const mockMovieService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  seedMovies: jest.fn(),
  deltaSync: jest.fn(),
  rateMovie: jest.fn(),
  removeRate: jest.fn(),
};

describe('MovieController', () => {
  let controller: MovieController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MovieController],
      providers: [
        {
          provide: MovieService,
          useValue: mockMovieService,
        },
      ],
    }).compile();

    controller = module.get<MovieController>(MovieController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should find all movies when movies are found', async () => {
    const movies = [{ id: 1 }, { id: 2 }];
    mockMovieService.findAll.mockResolvedValue({ movies, total: 2, page: 1, limit: 10 });

    const result = await controller.findAll({});

    expect(result).toEqual({ movies, total: 2, page: 1, limit: 10 });
    expect(mockMovieService.findAll).toHaveBeenCalledTimes(1);
  })

  it('should find one movie when movie is found', async () => {
    const movie = { id: 1 };
    mockMovieService.findOne.mockResolvedValue(movie);

    const result = await controller.findOne(1);

    expect(result).toEqual(movie);
    expect(mockMovieService.findOne).toHaveBeenCalledWith(1);
  })

  it('should seed movies when movies are found', async () => {
    const pages = '5';
    mockMovieService.seedMovies.mockResolvedValue({ seeded: 100 });

    const result = await controller.seedMovies({ pages });

    expect(result).toEqual({ seeded: 100 });
    expect(mockMovieService.seedMovies).toHaveBeenCalledWith(parseInt(pages));
  })

  it('should delta sync when movies are found', async () => {
    mockMovieService.deltaSync.mockResolvedValue({ seeded: 100 });

    const result = await controller.deltaSync();

    expect(result).toEqual({ seeded: 100 });
    expect(mockMovieService.deltaSync).toHaveBeenCalledTimes(1);
  })

  it('should addRateToMovie when movie and user are found', async () => {
    const user = { id: 1, email: 'test@test.com' };
    const movieId = 1;
    const rating = 5;

    mockMovieService.rateMovie.mockResolvedValue(undefined);

    const result = await controller.addRateToMovie(movieId, user, { rating });

    expect(result).toEqual(undefined);
    expect(mockMovieService.rateMovie).toHaveBeenCalledWith(movieId, user.id, rating);
  })

  it('should removeRate when movie and user are found', async () => {
    const user = { id: 1, email: 'test@test.com' };
    const movieId = 1;

    mockMovieService.removeRate.mockResolvedValue(undefined);

    const result = await controller.removeRateFromMovie(movieId, user);

    expect(result).toEqual(undefined);
    expect(mockMovieService.removeRate).toHaveBeenCalledWith(movieId, user.id);
  })

  it('should throw when user is not found', async () => {
    const user = { id: 1, email: 'test@test.com' };
    const movieId = 1;
    const rating = 5;

    mockMovieService.rateMovie.mockRejectedValue(new Error('User not found'));

    await expect(controller.addRateToMovie(movieId, user, { rating })).rejects.toThrow('User not found');
    expect(mockMovieService.rateMovie).toHaveBeenCalledWith(movieId, user.id, rating);
  })

  it('should throw when movie is not found', async () => {
    const user = { id: 1, email: 'test@test.com' };
    const movieId = 1;
    const rating = 5;

    mockMovieService.rateMovie.mockRejectedValue(new Error('Movie not found'));

    await expect(controller.addRateToMovie(movieId, user, { rating })).rejects.toThrow('Movie not found');
    expect(mockMovieService.rateMovie).toHaveBeenCalledWith(movieId, user.id, rating);
  })
});
