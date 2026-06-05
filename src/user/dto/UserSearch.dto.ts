import { IsEmail, IsInt, ValidateIf } from "class-validator";

export class UserSearchDto {
    @ValidateIf(dto => dto.email === undefined)
    @IsInt()
    id?: number;

    @ValidateIf(dto => dto.id === undefined)
    @IsEmail()
    email?: string;
}