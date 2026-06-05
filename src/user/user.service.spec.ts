import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '../prisma.service';

const mockPrismaService = {
  user: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: PrismaService, useValue: mockPrismaService }],
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
});

