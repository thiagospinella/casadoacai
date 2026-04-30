/**
 * Erro de negócio com statusCode HTTP. O global error handler (em index.ts)
 * detecta essa classe e responde com o status correto.
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}
