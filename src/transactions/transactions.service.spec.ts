import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './../users/entities/user.entity';
import { UsersService } from './../users/users.service';
import { Transaction } from './entities/transaction.entity';
import { TransactionsService } from './transactions.service';

const typeOrmTestConfig = TypeOrmModule.forRoot({
  type: 'sqlite',
  database: ':memory:',
  entities: [User, Transaction],
  synchronize: true,
});

describe('TransactionsService (Integration)', () => {
  let transactionsService: TransactionsService;
  let userRepo: Repository<User>;
  let transactionRepo: Repository<Transaction>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typeOrmTestConfig,
        TypeOrmModule.forFeature([User, Transaction]),
      ],
      providers: [UsersService, TransactionsService],
    }).compile();

    transactionsService = module.get<TransactionsService>(TransactionsService);

    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    transactionRepo = module.get<Repository<Transaction>>(
      getRepositoryToken(Transaction),
    );

    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(async () => {
    await transactionRepo.clear();
    await userRepo.clear();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  describe('transferFunds', () => {
    it('deve realizar transferência com sucesso', async () => {
      const sender = await userRepo.save({
        name: 'Jhon',
        username: 'john@mail.com',
        balance: 100,
        password: 'password',
      });
      const recipient = await userRepo.save({
        name: 'Maria',
        username: 'maria@email.com',
        balance: 0,
        password: 'password',
      });
      const amount = 50;
      const tx = await transactionsService.transferFunds(
        sender.id,
        recipient.id,
        amount,
      );
      expect(tx).toBeDefined();
      expect(tx.id).toBeDefined();
      expect(tx.type).toBe('TRANSFER');
      expect(tx.senderId).toBe(sender.id);
      expect(tx.receiverId).toBe(recipient.id);
      expect(Number(tx.amount)).toBe(amount);
      const updatedSender = await userRepo.findOneBy({ id: sender.id });
      const updatedRecipient = await userRepo.findOneBy({ id: recipient.id });
      expect(Number(updatedSender.balance)).toBe(50);
      expect(Number(updatedRecipient.balance)).toBe(50);
    });

    it('deve falhar se saldo insuficiente', async () => {
      const sender = await userRepo.save({
        name: 'bob',
        username: 'bob@email.com',
        balance: 10,
        password: 'password',
      });
      const recipient = await userRepo.save({
        name: 'alice',
        username: 'alice@email.com',
        balance: 0,
        password: 'password',
      });
      await expect(
        transactionsService.transferFunds(sender.id, recipient.id, 100),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve falhar se usuário remetente não existe', async () => {
      const recipient = await userRepo.save({
        name: 'jane',
        username: 'jane@email.com',
        balance: 0,
        password: 'password',
      });
      await expect(
        transactionsService.transferFunds(999, recipient.id, 50),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve falhar se transfer para si mesmo', async () => {
      const sender = await userRepo.save({
        name: 'sam',
        username: 'sam@email.com',
        balance: 100,
        password: 'password',
      });
      await expect(
        transactionsService.transferFunds(sender.id, sender.id, 50),
      ).rejects.toThrowError(BadRequestException);
    });
  });

  describe('depositFunds', () => {
    it('deve depositar com sucesso', async () => {
      const user = await userRepo.save({
        name: 'carlos',
        username: 'carlos@email.com',
        balance: 10,
        password: 'password',
      });
      const tx = await transactionsService.depositFunds(user.id, 40);
      expect(tx).toBeDefined();
      expect(tx.type).toBe('DEPOSIT');
      expect(tx.receiverId).toBe(user.id);
      expect(Number(tx.amount)).toBe(40);
      const updatedUser = await userRepo.findOneBy({ id: user.id });
      expect(Number(updatedUser.balance)).toBe(50);
    });

    it('deve falhar se usuário não existe', async () => {
      await expect(transactionsService.depositFunds(999, 40)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('revertTransaction', () => {
    it('deve reverter uma transferência com sucesso', async () => {
      const sender = await userRepo.save({
        name: 'sender',
        username: 'sender@email.com',
        balance: 100,
        password: 'password',
      });
      const receiver = await userRepo.save({
        name: 'receiver',
        username: 'receiver@email.com',
        balance: 20,
        password: 'password',
      });
      const tx = await transactionsService.transferFunds(
        sender.id,
        receiver.id,
        50,
      );
      expect(tx).toBeDefined();
      const revertTx = await transactionsService.revertTransaction(
        tx.id,
        sender.id,
      );
      expect(revertTx).toBeDefined();
      expect(revertTx.type).toBe('REVERT');
      expect(revertTx.senderId).toBe(receiver.id);
      expect(revertTx.receiverId).toBe(sender.id);
      expect(Number(revertTx.amount)).toBe(50);
      const updatedSender = await userRepo.findOneBy({ id: sender.id });
      const updatedReceiver = await userRepo.findOneBy({ id: receiver.id });
      expect(Number(updatedSender.balance)).toBe(100);
      expect(Number(updatedReceiver.balance)).toBe(20);
      const originalTx = await transactionRepo.findOneBy({ id: tx.id });
      expect(originalTx.isReversed).toBe(true);
    });

    it('deve falhar se a transação não existir', async () => {
      await expect(
        transactionsService.revertTransaction(999, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve falhar se não for o sender original tentando reverter', async () => {
      // Cria sender e receiver
      const sender = await userRepo.save({
        name: 'sender',
        username: 'sender@email.com',
        balance: 100,
        password: 'password',
      });
      const receiver = await userRepo.save({
        name: 'receiver',
        username: 'receiver@email.com',
        balance: 100,
        password: 'password',
      });
      const tx = await transactionsService.transferFunds(
        sender.id,
        receiver.id,
        50,
      );
      await expect(
        transactionsService.revertTransaction(tx.id, receiver.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve falhar se transação já foi revertida', async () => {
      const sender = await userRepo.save({
        name: 's1',
        username: 's1@email.com',
        balance: 100,
        password: 'password',
      });
      const receiver = await userRepo.save({
        name: 'r1',
        username: 'r1@email.com',
        balance: 100,
        password: 'password',
      });
      const tx = await transactionsService.transferFunds(
        sender.id,
        receiver.id,
        30,
      );
      await transactionsService.revertTransaction(tx.id, sender.id);
      await expect(
        transactionsService.revertTransaction(tx.id, sender.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve falhar se transação não for do tipo TRANSFER', async () => {
      const user = await userRepo.save({
        name: 'depo',
        username: 'depo@gmail.com',
        balance: 0,
        password: 'password',
      });
      const depositTx = await transactionsService.depositFunds(user.id, 50);
      await expect(
        transactionsService.revertTransaction(depositTx.id, user.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve falhar se destinatário não tem saldo para devolver', async () => {
      const sender = await userRepo.save({
        name: 's2',
        username: 's2@gmail.com',
        balance: 100,
        password: 'password',
      });
      const receiver = await userRepo.save({
        name: 'r2',
        username: 'r2@gmail.com',
        balance: 1,
        password: 'password',
      });
      const tx = await transactionsService.transferFunds(
        sender.id,
        receiver.id,
        50,
      );
      receiver.balance = 0;
      await userRepo.save(receiver);
      await expect(
        transactionsService.revertTransaction(tx.id, sender.id),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
