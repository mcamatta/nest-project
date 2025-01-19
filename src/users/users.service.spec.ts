import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegisterUserDto } from './dto/register-user.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

const typeOrmTestConfig = TypeOrmModule.forRoot({
  type: 'sqlite',
  database: ':memory:',
  entities: [User],
  synchronize: true, // apenas em ambiente de teste
});

describe('UsersService (Integration)', () => {
  let usersService: UsersService;
  let usersRepository: Repository<User>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [typeOrmTestConfig, TypeOrmModule.forFeature([User])],
      providers: [UsersService],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(async () => {
    await usersRepository.clear();
  });

  it('deve criar um usuário novo com sucesso', async () => {
    const input: RegisterUserDto = {
      name: 'Jonh',
      username: 'john.doe@gmail.com',
      password: 'secret123',
    };
    const user = await usersService.register(input);

    expect(user.id).toBeDefined();
    expect(user.username).toBe('john.doe@gmail.com');
    expect(user.password).not.toBe('secret123');

    const stored = await usersRepository.findOneBy({
      username: input.username,
    });
    expect(stored).toBeDefined();
    expect(stored.id).toEqual(user.id);
  });

  it('deve lançar exceção se username já existir', async () => {
    await usersRepository.save({
      name: 'Alice',
      username: 'alice@email.com',
      password: 'hashedpwd',
    });
    const input: RegisterUserDto = {
      name: 'Alice',
      username: 'alice@email.com',
      password: '123456',
    };
    await expect(usersService.register(input)).rejects.toThrow(
      BadRequestException,
    );
  });
});
