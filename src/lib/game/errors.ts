export class GameInvariantError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "GameInvariantError";
    this.code = code;
  }
}
