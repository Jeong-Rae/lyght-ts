import { LogLevel, Meta } from "../types";
import { LOG_LEVEL_PADDING } from "../constants";
import { toISOString, toTimeString } from "../utils/datetime";

/**
 * 로그 포맷터 인터페이스
 */
export interface LogFormatter {
	format(level: LogLevel, message: string, meta: Meta, timestamp: Date): string;
}

/**
 * 기본 포맷터 - ISO 타임스탬프 + [LEVEL] + 메시지 + JSON 메타
 */
export class DefaultFormatter implements LogFormatter {
	format(
		level: LogLevel,
		message: string,
		meta: Meta,
		timestamp: Date,
	): string {
		const formattedTimestamp = toISOString(timestamp);
		const formattedLevel = `[${level.toUpperCase()}]`;
		const formattedMeta =
			Object.keys(meta).length > 0 ? JSON.stringify(meta) : "";
		return `${formattedTimestamp} ${formattedLevel} ${message} ${formattedMeta}\n`;
	}
}

/**
 * JSON 포맷터 - 완전한 JSON 객체 형태
 */
export class JsonFormatter implements LogFormatter {
	format(
		level: LogLevel,
		message: string,
		meta: Meta,
		timestamp: Date,
	): string {
		const logEntry = {
			timestamp: toISOString(timestamp),
			level: level.toUpperCase(),
			message,
			...meta,
		};
		return JSON.stringify(logEntry) + "\n";
	}
}

/**
 * 심플 포맷터 - HH:MM:SS + 레벨 + 메시지
 */
export class SimpleFormatter implements LogFormatter {
	format(
		level: LogLevel,
		message: string,
		meta: Meta,
		timestamp: Date,
	): string {
		const formattedTime = toTimeString(timestamp);
		const formattedLevel = level.padEnd(LOG_LEVEL_PADDING);
		const formattedMeta =
			Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : "";
		return `${formattedTime} ${formattedLevel} ${message}${formattedMeta}\n`;
	}
}

/**
 * 커스텀 포맷터 - 사용자 정의 포맷 함수 사용
 */
export class CustomFormatter implements LogFormatter {
	constructor(
		private formatFn: (
			level: LogLevel,
			message: string,
			meta: Meta,
			timestamp: Date,
		) => string,
	) {}

	format(
		level: LogLevel,
		message: string,
		meta: Meta,
		timestamp: Date,
	): string {
		return this.formatFn(level, message, meta, timestamp);
	}
}
