import { IsEmail, IsNotEmpty, Matches, MinLength } from 'class-validator';

export class UserCredentialDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsNotEmpty()
  @MinLength(6)
  @Matches(/^[^\s]*$/, { message: 'Password must not contain spaces' })
  password!: string;
}