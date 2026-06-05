import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
};

const mockUserService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
};

describe('AuthService', () => {
    let service: AuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [AuthService,
                {
                    provide: JwtService,
                    useValue: mockJwtService,
                },
                {
                    provide: UserService,
                    useValue: mockUserService,
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should sign up and return JWT token', async () => {
        const email = 'test@example.com';
        const password = 'password';
        const token = 'jwt_token';

        mockUserService.findByEmail.mockResolvedValue(null);
        mockUserService.create.mockResolvedValue(undefined);

        const result = await service.register({ email, password });

        expect(mockUserService.findByEmail).toHaveBeenCalledWith(email);
        expect(mockUserService.create).toHaveBeenCalledWith({ email, password });
        expect(result).toBeUndefined();
    });

    it('should throw error if user already exists', async () => {
        const email = 'test@example.com';
        const password = 'password';
        const user = { id: 1, email, passwordHash: 'hash' };

        mockUserService.findByEmail.mockResolvedValue(user);

        await expect(service.register({ email, password })).rejects.toThrow('User already exists');
    });

    it('should login and return JWT token', async () => {
        const email = 'test@example.com';
        const password = 'password';
        const user = { id: 1, email, passwordHash: 'hash' };
        const token = 'jwt_token';

        mockUserService.findByEmail.mockResolvedValue(user);
        mockJwtService.signAsync.mockResolvedValue(token);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        const result = await service.login({ email, password });

        expect(mockUserService.findByEmail).toHaveBeenCalledWith(email);
        expect(mockJwtService.signAsync).toHaveBeenCalledWith({ id: 1, email });
        expect(result).toEqual({ token });
    });

    it('should throw error if user does not exist', async () => {
        const email = 'test@example.com';
        const password = 'password';

        mockUserService.findByEmail.mockResolvedValue(null);

        await expect(service.login({ email, password })).rejects.toThrow('Invalid credentials');
    });

    it('should throw error if invalid password', async () => {
        const email = 'test@example.com';
        const password = 'password';
        const user = { id: 1, email, passwordHash: 'hash' };

        mockUserService.findByEmail.mockResolvedValue(user);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(service.login({ email, password })).rejects.toThrow('Invalid credentials');
    });
});
