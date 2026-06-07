import { IsNotEmpty, IsNumber, Max, Min } from "class-validator";

export class RateMovieDto {
    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    @Max(10)
    readonly rating: number;
}