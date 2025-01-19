import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class RegisterUserDto {
  @IsNotEmpty()
  name: string;

  @IsEmail()
  username: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
