import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { compare } from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;

  beforeEach(async () => {
    usersService = {
      findByUsername: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('fake-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('deve retornar null se usuário não for encontrado', async () => {
      (usersService.findByUsername as jest.Mock).mockResolvedValue(null);
      const result = await authService.validateUser('inexistente', 'password');
      expect(result).toBeNull();
      expect(usersService.findByUsername).toHaveBeenCalledWith('inexistente');
    });

    it('deve retornar null se a senha for incorreta', async () => {
      (usersService.findByUsername as jest.Mock).mockResolvedValue({
        id: 1,
        username: 'john',
        password: 'hashedPwd',
      });
      (compare as jest.Mock).mockResolvedValue(false);
      const result = await authService.validateUser('john', 'wrong');
      expect(result).toBeNull();
      expect(compare).toHaveBeenCalledWith('wrong', 'hashedPwd');
    });

    it('deve retornar objeto do usuário se credenciais corretas', async () => {
      (usersService.findByUsername as jest.Mock).mockResolvedValue({
        id: 1,
        username: 'john',
        password: 'hashedPwd',
      });
      (compare as jest.Mock).mockResolvedValue(true);
      const result = await authService.validateUser('john', 'secret');
      expect(result).toEqual({ id: 1, username: 'john' });
      expect(compare).toHaveBeenCalledWith('secret', 'hashedPwd');
    });
  });

  describe('login', () => {
    it('deve retornar um access_token', async () => {
      const user = { id: 1, username: 'john' };
      const result = await authService.login(user as any);
      expect(jwtService.sign).toHaveBeenCalledWith({
        username: 'john',
        sub: 1,
      });
      expect(result).toEqual({ access_token: 'fake-jwt-token' });
    });
  });
});
