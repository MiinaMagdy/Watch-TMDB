import { IsInt } from "class-validator";

export class MovieIdDto {
    @IsInt()
    movieId: number
}