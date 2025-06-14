import { LogLevel, Meta } from "../types";

/**
 * 로그 포맷터 인터페이스
 */
export interface LogFormatter {
	format(level: LogLevel, message: string, meta: Meta, timestamp: Date): string;
} 