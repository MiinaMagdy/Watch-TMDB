import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { isAxiosError } from "axios";
import { Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const { status, message } = this.resolveException(exception);

        if (status >= 500) {
            this.logger.error(
                `[${request.method}] ${request.url} → ${status}`,
                exception instanceof Error ? exception.stack : String(exception),
            );
        }

        response.status(status).json({
            statusCode: status,
            error: message,
            path: request.url,
            timestamp: new Date().toISOString(),
        });
    }

    private resolveException(exception: unknown): { status: number, message: string } {
        if (exception instanceof HttpException) {
            const res = exception.getResponse();
            const status = exception.getStatus();
            const message = typeof res === "string" ? res : (res as any).message;
            return { status, message };
        }

        if (isAxiosError(exception)) {
            const status = exception.response?.status ?? HttpStatus.SERVICE_UNAVAILABLE;
            const messages: Record<number, string> = {
                401: 'Invalid TMDB API credentials',
                404: 'TMDB resource not found',
                429: 'Exceeded TMDB API rate limit'
            }
            const message = messages[status] ?? 'TMDB service error';
            return { status, message };
        }

        if (exception instanceof Prisma.PrismaClientKnownRequestError) {
            switch (exception.code) {
                case 'P2002':
                    return { status: HttpStatus.CONFLICT, message: 'Resource already exists' };
                case 'P2003':
                    return { status: HttpStatus.BAD_REQUEST, message: 'Invalid reference provided' };
                case 'P2025':
                    return { status: HttpStatus.NOT_FOUND, message: 'Resource not found' };
                default:
                    return { status: HttpStatus.BAD_REQUEST, message: 'Database request error' };
            }
        }

        return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'An unexpected error occurred' }
    }
}

