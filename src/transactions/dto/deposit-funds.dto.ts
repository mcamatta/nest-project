import { IsNumber, IsPositive } from 'class-validator';

export class DepositFundsDto {
  @IsNumber()
  @IsPositive()
  amount: number;
}
