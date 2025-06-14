import { LogLevel, Meta } from "../types";
import { toISOString } from "../utils/datetime";
import { LogFormatter } from "./log-formatter";

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
			Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
		return `${formattedTimestamp} ${formattedLevel} ${message}${formattedMeta}\n`;
	}
} 