export class AppError extends Error {
  constructor(message, statusCode = 400, fields = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.fields = fields;
  }
}

export function createAppError(message, statusCode = 400, fields = null) {
  return new AppError(message, statusCode, fields);
}
