import { IsEmail, IsInt } from 'class-validator';

export class UserTokenPayload {
    @IsInt()
    id: number;

    @IsEmail()
    email: string;
}