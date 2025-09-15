export class GitNotFoundError extends Error {
  constructor(message = 'git executable not found. Please install git and ensure it is in PATH.') {
    super(message);
    this.name = 'GitNotFoundError';
  }
}
