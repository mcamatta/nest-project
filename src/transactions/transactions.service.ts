import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UsersService } from './../users/users.service';
import { Transaction } from './entities/transaction.entity';

@Injectable()
export class TransactionsService {
  constructor(
    private dataSource: DataSource,
    private usersService: UsersService,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {}

  async transferFunds(senderId: number, recipientId: number, amount: number) {
    if (senderId === recipientId) {
      throw new BadRequestException(
        'O destinatário deve ser diferente do remetente.',
      );
    }
    return this.dataSource.transaction(async (manager) => {
      const sender = await this.usersService.findById(senderId);
      const recipient = await this.usersService.findById(recipientId);
      if (!sender) {
        throw new BadRequestException('Usuário remetente não encontrado');
      }
      if (!recipient) {
        throw new BadRequestException('Usuário destinatário não encontrado');
      }
      if (Number(sender.balance) < amount) {
        throw new BadRequestException('Saldo insuficiente');
      }
      sender.balance = Number(sender.balance) - amount;
      recipient.balance = Number(recipient.balance) + amount;
      await manager.save(sender);
      await manager.save(recipient);
      const transaction = this.transactionRepository.create({
        amount,
        senderId,
        type: 'TRANSFER',
        receiverId: recipientId,
      });
      return await manager.save(transaction);
    });
  }

  async depositFunds(userId: number, amount: number): Promise<Transaction> {
    return this.dataSource.transaction(async (manager) => {
      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new BadRequestException('Usuário não encontrado.');
      }
      user.balance = Number(user.balance) + amount;
      await manager.save(user);
      const transaction = this.transactionRepository.create({
        amount,
        senderId: null,
        type: 'DEPOSIT',
        receiverId: user.id,
      });
      return await manager.save(transaction);
    });
  }

  async revertTransaction(transactionId: number, userId: number) {
    return this.dataSource.transaction(async (manager) => {
      const originalTx = await this.transactionRepository.findOneBy({
        id: transactionId,
      });
      if (!originalTx) {
        throw new BadRequestException('Transação não encontrada.');
      }
      if (originalTx.senderId !== userId) {
        throw new BadRequestException('Não é possível reverter essa transaçãp');
      }
      if (originalTx.isReversed) {
        throw new BadRequestException('Esta transação já foi revertida.');
      }
      if (originalTx.type !== 'TRANSFER') {
        throw new BadRequestException(
          'Somente transações de transferência podem ser revertidas.',
        );
      }
      const sender = await this.usersService.findById(originalTx.senderId);
      const receiver = await this.usersService.findById(originalTx.receiverId);
      if (!sender || !receiver) {
        throw new BadRequestException(
          'Transação inválida: remetente ou destinatário ausente.',
        );
      }
      const receiverBalance = Number(receiver.balance);
      if (receiverBalance < Number(originalTx.amount)) {
        throw new BadRequestException(
          'O destinatário não possui saldo suficiente para a reversão.',
        );
      }
      receiver.balance = receiverBalance - Number(originalTx.amount);
      sender.balance = Number(sender.balance) + Number(originalTx.amount);
      await manager.save(receiver);
      await manager.save(sender);
      originalTx.isReversed = true;
      await manager.save(originalTx);
      const revertTx = this.transactionRepository.create({
        type: 'REVERT',
        senderId: receiver.id,
        receiverId: sender.id,
        amount: originalTx.amount,
      });
      return manager.save(revertTx);
    });
  }
}
