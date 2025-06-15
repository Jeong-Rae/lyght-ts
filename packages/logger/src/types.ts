/**
 * 로그 레벨 타입
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 메타데이터 타입
 */
export type Meta = Record<string, unknown>;

/**
 * Transport 인터페이스
 */
export interface Transport {
  log(level: LogLevel, message: string, meta?: Meta, timestamp?: Date): void;
}

export interface ApmClient {
  captureException(error: Error): void;
  captureMessage(message: string, options?: { level: LogLevel }): void;
}
