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
