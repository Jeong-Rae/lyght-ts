import { LogLevel, Meta } from "../types";
import { LogFormatter } from "./log-formatter";

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