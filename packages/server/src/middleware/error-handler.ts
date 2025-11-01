import type { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  void _next;
  console.error('Error:', err);

  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
}
