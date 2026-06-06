import { IsEnum, IsInt, IsOptional, IsString } from "class-validator";
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
}
