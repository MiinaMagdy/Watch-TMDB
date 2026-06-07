import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma.service';
import { MovieService } from '../movie/movie.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

const mockPrismaService = {
  user: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockMovieService = {
  findOne: jest.fn(),
}

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MovieService, useValue: mockMovieService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a user when given valid credentials', async () => {
    const dto = { email: 'test@example.com', password: 'password' };
    mockPrismaService.user.create.mockResolvedValue({});

    await service.create(dto);

    expect(mockPrismaService.user.create).toHaveBeenCalledTimes(1);
  });

  it('should find user by email', async () => {
    const email = 'test@example.com';
    const user = { id: 1, email, passwordHash: 'hashedPassword' };
    mockPrismaService.user.findFirst.mockResolvedValue(user);

    const result = await service.findOne({ email });

    expect(result).toEqual(user);
    expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({ where: { email } });
  });

  it('should return null when user is not found', async () => {
    mockPrismaService.user.findFirst.mockResolvedValue(null);

    const result = await service.findOne({ email: 'notfound@example.com' });

    expect(result).toBeNull();
  });

  it('should find user by id', async () => {
    const id = 1;
    const user = { id, email: 'test@example.com', passwordHash: 'hashedPassword' };
    mockPrismaService.user.findFirst.mockResolvedValue(user);

    const result = await service.findOne({ id });

    expect(result).toEqual(user);
    expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({ where: { id } });
  });

  it('should return null when user is not found', async () => {
    mockPrismaService.user.findFirst.mockResolvedValue(null);

    const result = await service.findOne({ id: 2 });

    expect(result).toBeNull();
    expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({ where: { id: 2 } });
  });

  it('should get user watchlist', async () => {
    const userId = 1;
    const watchlist = [{ tmdbId: 1 }, { tmdbId: 2 }];
    mockCacheManager.get.mockResolvedValue(undefined);
    mockPrismaService.user.findUnique.mockResolvedValue({ watchlist });

    const result = await service.getWatchlist(userId);

    expect(result).toEqual({ watchlist });
    expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { id: userId }, select: { watchlist: true } });
    expect(mockCacheManager.set).toHaveBeenCalledWith(`watchlist:${userId}`, { watchlist });
  });

  it('should add movie to watchlist when movie exists', async () => {
    const userId = 1;
    const tmdbId = 1;
    mockPrismaService.user.findUnique.mockResolvedValue({ watchlist: [] });
    mockMovieService.findOne.mockResolvedValue({ tmdbId });
    mockPrismaService.user.update.mockResolvedValue({});

    await service.addToWatchlist(userId, tmdbId);

    expect(mockMovieService.findOne).toHaveBeenCalledWith(tmdbId);
    expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { id: userId }, select: { watchlist: true } });
    expect(mockPrismaService.user.update).toHaveBeenCalledWith({ where: { id: userId }, data: { watchlist: { connect: { tmdbId } } } });
    expect(mockCacheManager.del).toHaveBeenCalledWith(`watchlist:${userId}`);
  });

  it('should throw error when movie does not exist', async () => {
    const userId = 1;
    const tmdbId = 1;
    mockMovieService.findOne.mockResolvedValue(null);

    await expect(service.addToWatchlist(userId, tmdbId)).rejects.toThrow(`Movie with tmdbId: ${tmdbId} not found`);
  });

  it('should throw error when movie is already in watchlist', async () => {
    const userId = 1;
    const tmdbId = 1;
    mockMovieService.findOne.mockResolvedValue({ tmdbId });
    mockPrismaService.user.findUnique.mockResolvedValue({ watchlist: [{ tmdbId }] });

    await expect(service.addToWatchlist(userId, tmdbId)).rejects.toThrow(`Movie with tmdbId: ${tmdbId} is already in the user's watchlist`);
    expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { id: userId }, select: { watchlist: true } });
    expect(mockMovieService.findOne).toHaveBeenCalledWith(tmdbId);
    expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    expect(mockCacheManager.del).not.toHaveBeenCalled();
  });

  it('should remove movie from watchlist when movie exists', async () => {
    const userId = 1;
    const tmdbId = 1;
    mockPrismaService.user.findUnique.mockResolvedValue({ watchlist: [{ tmdbId }] });
    mockPrismaService.user.update.mockResolvedValue({});

    await service.removeFromWatchlist(userId, tmdbId);

    expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { id: userId }, select: { watchlist: true } });
    expect(mockPrismaService.user.update).toHaveBeenCalledWith({ where: { id: userId }, data: { watchlist: { disconnect: { tmdbId } } } });
    expect(mockCacheManager.del).toHaveBeenCalledWith(`watchlist:${userId}`);
  });

  it('should throw error when movie is not in watchlist', async () => {
    const userId = 1;
    const tmdbId = 1;
    mockPrismaService.user.findUnique.mockResolvedValue({ watchlist: [] });

    await expect(service.removeFromWatchlist(userId, tmdbId)).rejects.toThrow('Movie with tmdbId: 1 is not in the user\'s watchlist');
  });
});

