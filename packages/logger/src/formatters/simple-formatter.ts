import { LogLevel, Meta } from "../types";
import { LOG_LEVEL_PADDING } from "../constants";
import { toTimeString } from "../utils/datetime";
import { LogFormatter } from "./log-formatter";

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