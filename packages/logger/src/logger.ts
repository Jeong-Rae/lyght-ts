import { LogLevel, Transport, Meta } from "./types";
import { now } from "./utils/datetime";
import { isLogLevelEnabled, isValidLogLevel } from "./utils/log-level";

/**
 * 메인 Logger 클래스
 */
export class Logger {
	private static logLevel: LogLevel = "info";
	private static transports: Transport[] = [];

	/**
	 * 환경변수에서 로그 레벨을 설정합니다.
	 *
	 * @example
	 * ```typescript
	 * process.env.LOG_LEVEL = "debug";
	 * ```
	 */
	static {
		const envLogLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
		if (envLogLevel && isValidLogLevel(envLogLevel)) {
			Logger.logLevel = envLogLevel;
		}
	}

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
	static setLevel(level: LogLevel): void {
		Logger.logLevel = level;
	}

	/**
	 * 현재 로그 레벨을 반환합니다.
	 *
	 * @returns {LogLevel} 현재 로그 레벨
	 */
	static getLevel(): LogLevel {
		return Logger.logLevel;
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
	static useTransports(...transports: Transport[]): void {
		Logger.transports = transports;
	}

	/**
	 * 현재 설정된 Transport 목록을 반환합니다.
	 *
	 * @returns {Transport[]} 현재 설정된 Transport 목록
	 */
	static getTransports(): Transport[] {
		return [...Logger.transports];
	}

	/**
	 * 지정된 레벨의 로그를 출력할지 확인합니다.
	 *
	 * @param {LogLevel} level - 확인할 로그 레벨
	 * @returns {boolean} 지정된 레벨의 로그를 출력할지 여부
	 */
	static shouldLog(level: LogLevel): boolean {
		return isLogLevelEnabled(level, Logger.logLevel);
	}

	/**
	 * 로그를 출력합니다.
	 *
	 * @param {LogLevel} level - 로그 레벨
	 * @param {string} message - 로그 메시지
	 * @param {Meta} meta - 메타 데이터
	 */
	private static log(level: LogLevel, message: string, meta: Meta = {}): void {
		if (!Logger.shouldLog(level)) {
			return;
		}

		const timestamp = now();

		// 모든 transport에 로그 전송
		Logger.transports.forEach((transport) => {
			try {
				transport.log(level, message, meta, timestamp);
			} catch (error) {
				// Transport 에러는 무시 (무한 루프 방지)
			}
		});
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
	static debug(message: string, meta: Meta = {}): void {
		Logger.log("debug", message, meta);
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
	static info(message: string, meta: Meta = {}): void {
		Logger.log("info", message, meta);
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
	static warn(message: string, meta: Meta = {}): void {
		Logger.log("warn", message, meta);
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
	static error(errOrMsg: string | Error, meta: Meta = {}): void {
		if (errOrMsg instanceof Error) {
			const errorMeta = {
				name: errOrMsg.name,
				message: errOrMsg.message,
				stack: errOrMsg.stack,
				...meta,
			};
			Logger.log("error", errOrMsg.message, errorMeta);
		} else {
			Logger.log("error", errOrMsg, meta);
		}
	}
}
