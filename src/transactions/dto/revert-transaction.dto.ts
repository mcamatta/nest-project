import { IsNotEmpty, IsNumber } from 'class-validator';

export class RevertTransactionDto {
  @IsNumber()
  @IsNotEmpty()
  transactionId: number;
}
