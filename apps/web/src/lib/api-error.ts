export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    /** Código de negocio del backend (ej. `SESSION_REPLACED`) cuando lo trae. */
    public readonly code?: string,
  ) {
    super(message);
  }
}
