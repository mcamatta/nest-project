// transactions/transactions.controller.ts
import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport'; // Exemplo se estiver usando passport local/jwt
import { DepositFundsDto } from './dto/deposit-funds.dto';
import { RevertTransactionDto } from './dto/revert-transaction.dto';
import { TransferFundsDto } from './dto/transfer-funds.dto';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('transfer')
  async transferFunds(@Request() req, @Body() dto: TransferFundsDto) {
    const senderId = req.user.userId;
    const { recipientId, amount } = dto;
    const transaction = await this.transactionsService.transferFunds(
      senderId,
      recipientId,
      amount,
    );
    return {
      message: 'Transferência realizada com sucesso',
      transaction,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('deposit')
  async deposit(@Request() req, @Body() dto: DepositFundsDto) {
    const userId = req.user.userId;
    const { amount } = dto;
    const transaction = await this.transactionsService.depositFunds(
      userId,
      amount,
    );
    return {
      message: 'Depósito realizado com sucesso',
      transaction,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('revert')
  async revertTransaction(@Request() req, @Body() dto: RevertTransactionDto) {
    const userId = req.user.userId;
    const { transactionId } = dto;
    const newRevertTx = await this.transactionsService.revertTransaction(
      transactionId,
      userId,
    );

    return {
      message: 'Transação revertida com sucesso',
      revertTransaction: newRevertTx,
    };
  }
}
