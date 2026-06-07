import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

const mockUserService = {
  create: jest.fn(),
  findOne: jest.fn(),
  addToWatchlist: jest.fn(),
  removeFromWatchlist: jest.fn(),
};

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: mockUserService }
      ]
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should add movie to watchlist', () => {
    const dto = { movieId: 1 };
    const user = { id: 1, email: 'test@test.com' };
    mockUserService.addToWatchlist.mockResolvedValue({});
    controller.addToWatchlist(user, dto);
    expect(mockUserService.addToWatchlist).toHaveBeenCalledWith(user.id, dto.movieId);
  });

  it('should remove movie from watchlist', () => {
    const dto = { movieId: 1 };
    const user = { id: 1, email: 'test@test.com' };
    mockUserService.removeFromWatchlist.mockResolvedValue({});
    controller.removeFromWatchlist(user, dto);
    expect(mockUserService.removeFromWatchlist).toHaveBeenCalledWith(user.id, dto.movieId);
  });

  it('should not add already existing movie to watchlist', async () => {
    const dto = { movieId: 1 };
    const user = { id: 1, email: 'test@test.com' };
    mockUserService.addToWatchlist.mockRejectedValue(new ConflictException(`Movie with tmdbId: ${dto.movieId} is already in the user's watchlist`));
    await expect(controller.addToWatchlist(user, dto)).rejects.toThrow(ConflictException);
  })

  it('should not remove non-existent movie from watchlist', async () => {
    const dto = { movieId: 1 };
    const user = { id: 1, email: 'test@test.com' };
    mockUserService.removeFromWatchlist.mockRejectedValue(new NotFoundException(`Movie with tmdbId: ${dto.movieId} is not in the user's watchlist`));
    await expect(controller.removeFromWatchlist(user, dto)).rejects.toThrow(NotFoundException);
  })
});
