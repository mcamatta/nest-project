import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class TransferFundsDto {
  @IsNumber()
  @IsNotEmpty()
  recipientId: number;

  @IsNumber()
  @IsPositive()
  amount: number;
}
