import type { LogLevel, Meta, Transport } from './types';
import { now } from './utils/datetime';
import { isLogLevelEnabled, isValidLogLevel } from './utils/log-level';

/**
 * 메인 Logger 네임스페이스
 */
export namespace Logger {
  let logLevel: LogLevel = 'info';
  let transports: Transport[] = [];

  /**
   * 환경변수에서 로그 레벨을 설정합니다.
   */
  const initializeFromEnv = (() => {
    const envLogLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
    if (envLogLevel && isValidLogLevel(envLogLevel)) {
      logLevel = envLogLevel;
    }
  })();

  /**
   * 로그 레벨을 설정합니다.
   *
   * @param {LogLevel} level - 설정할 로그 레벨
   *
   * @example
   * ```typescript
   * Logger.setLevel("debug");
   * ```
   */
  export function setLevel(level: LogLevel): void {
    logLevel = level;
  }

  /**
   * 현재 로그 레벨을 반환합니다.
   *
   * @returns {LogLevel} 현재 로그 레벨
   */
  export function getLevel(): LogLevel {
    return logLevel;
  }

  /**
   * Transport를 추가합니다.
   *
   * @param {Transport[]} transports - 추가할 Transport 배열
   *
   * @example
   * ```typescript
   * Logger.useTransports(new ConsoleTransport(), new FileTransport());
   * ```
   */
  export function useTransports(...transportList: Transport[]): void {
    transports = transportList;
  }

  /**
   * 현재 설정된 Transport 목록을 반환합니다.
   *
   * @returns {Transport[]} 현재 설정된 Transport 목록
   */
  export function getTransports(): Transport[] {
    return [...transports];
  }

  /**
   * 지정된 레벨의 로그를 출력할지 확인합니다.
   *
   * @param {LogLevel} level - 확인할 로그 레벨
   * @returns {boolean} 지정된 레벨의 로그를 출력할지 여부
   */
  export function shouldLog(level: LogLevel): boolean {
    return isLogLevelEnabled(level, logLevel);
  }

  /**
   * 로그를 출력합니다.
   *
   * @param {LogLevel} level - 로그 레벨
   * @param {string} message - 로그 메시지
   * @param {Meta} meta - 메타 데이터
   */
  function log(level: LogLevel, message: string, meta: Meta = {}): void {
    if (!shouldLog(level)) {
      return;
    }

    const timestamp = now();

    // 모든 transport에 로그 전송
    for (const transport of transports) {
      try {
        transport.log(level, message, meta, timestamp);
      } catch {
        // Transport 에러는 무시 (무한 루프 방지)
      }
    }
  }

  /**
   * DEBUG 레벨 로그를 출력합니다.
   *
   * @param {string} message - 로그 메시지
   * @param {Meta} meta - 메타 데이터
   *
   * @example
   * ```typescript
   * Logger.debug("Debug message", { userId: 123 });
   * ```
   */
  export function debug(message: string, meta: Meta = {}): void {
    log('debug', message, meta);
  }

  /**
   * INFO 레벨 로그를 출력합니다.
   *
   * @param {string} message - 로그 메시지
   * @param {Meta} meta - 메타 데이터
   *
   * @example
   * ```typescript
   * Logger.info("Info message", { userId: 123 });
   * ```
   */
  export function info(message: string, meta: Meta = {}): void {
    log('info', message, meta);
  }

  /**
   * WARN 레벨 로그를 출력합니다.
   *
   * @param {string} message - 로그 메시지
   * @param {Meta} meta - 메타 데이터
   *
   * @example
   * ```typescript
   * Logger.warn("Warn message", { userId: 123 });
   * ```
   */
  export function warn(message: string, meta: Meta = {}): void {
    log('warn', message, meta);
  }

  /**
   * ERROR 레벨 로그를 출력합니다.
   *
   * @param {string | Error} errOrMsg - 로그 메시지 또는 Error 객체
   * @param {Meta} meta - 메타 데이터
   *
   * @example
   * ```typescript
   * Logger.error("Error message", { userId: 123 });
   *
   * Logger.error(new Error("Error message"), { userId: 123 });
   * ```
   */
  export function error(errOrMsg: string | Error, meta: Meta = {}): void {
    if (errOrMsg instanceof Error) {
      const errorMeta = {
        name: errOrMsg.name,
        message: errOrMsg.message,
        stack: errOrMsg.stack,
        ...meta,
      };
      log('error', errOrMsg.message, errorMeta);
    } else {
      log('error', errOrMsg, meta);
    }
  }
}
