import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class MovieQueryDto {
    @IsInt()
    @IsOptional()
    @Type(() => Number)
    page?: number;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    limit?: number;

    @IsString()
    @IsOptional()
    search?: string;

    @IsEnum(['popularity', 'voteAverage', 'releaseDate'])
    @IsOptional()
    sortBy?: 'popularity' | 'voteAverage' | 'releaseDate';

    // genre ids will be passed comma separated like "1,2,3"
    @IsString()
    @IsOptional()
    genreIds?: string;

    @Max(10)
    @Min(0)
    @IsInt()
    @Type(() => Number)
    @IsOptional()
    minRating?: number
}
