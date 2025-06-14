import { LogLevel, Meta } from "../types";
import { toISOString } from "../utils/datetime";
import { LogFormatter } from "./log-formatter";

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