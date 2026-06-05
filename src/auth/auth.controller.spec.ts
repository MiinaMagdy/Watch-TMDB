import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { ConflictException, UnauthorizedException } from "@nestjs/common";

const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
};

describe("AuthController", () => {
    let controller: AuthController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
            ],
        }).compile();

        controller = module.get<AuthController>(AuthController);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    it("should register a user", async () => {
        const dto = { email: 'test@example.com', password: 'password' };
        mockAuthService.register.mockResolvedValue(undefined);

        const result = await controller.register(dto);

        expect(mockAuthService.register).toHaveBeenCalledWith(dto);
        expect(result).toEqual({ message: 'User registered successfully!' });
    });

    it('should login and return token', async () => {
        const dto = { email: 'test@example.com', password: 'password' };
        const token = 'jwt_token';
        mockAuthService.login.mockResolvedValue({ token });

        const result = await controller.login(dto);

        expect(mockAuthService.login).toHaveBeenCalledWith(dto);
        expect(result).toEqual({ token });
    });

    it('should throw error if user already exists', async () => {
        const dto = { email: 'test@example.com', password: 'password' };
        mockAuthService.register.mockRejectedValue(new ConflictException('User already exists'));

        await expect(controller.register(dto)).rejects.toThrow('User already exists');
    });

    it('should throw error if invalid credentials', async () => {
        const dto = { email: 'test@example.com', password: 'password' };
        mockAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

        await expect(controller.login(dto)).rejects.toThrow('Invalid credentials');
    });
});
