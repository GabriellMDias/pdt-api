export class MobileSyncTemporaryError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'MobileSyncTemporaryError';
  }
}

export class MobileSyncPermanentError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'MobileSyncPermanentError';
  }
}
