import { LogLevel, Meta } from "../types";
import { LOG_LEVEL_PADDING } from "../constants";

export interface LogFormatter {
	format(level: LogLevel, message: string, meta: Meta, timestamp: Date): string;
}

export class DefaultFormatter implements LogFormatter {
	format(
		level: LogLevel,
		message: string,
		meta: Meta,
		timestamp: Date,
	): string {
		const ts = timestamp.toISOString();
		return `${ts} [${level.toUpperCase()}] ${message} ${JSON.stringify(meta)}\n`;
	}
}

export class JsonFormatter implements LogFormatter {
	format(
		level: LogLevel,
		message: string,
		meta: Meta,
		timestamp: Date,
	): string {
		const logEntry = {
			timestamp: timestamp.toISOString(),
			level: level.toUpperCase(),
			message,
			...meta,
		};
		return JSON.stringify(logEntry) + "\n";
	}
}

export class SimpleFormatter implements LogFormatter {
	format(
		level: LogLevel,
		message: string,
		meta: Meta,
		timestamp: Date,
	): string {
		const ts = timestamp.toISOString().split("T")[1].split(".")[0]; // HH:MM:SS
		const metaStr =
			Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : "";
		return `${ts} ${level.padEnd(LOG_LEVEL_PADDING)} ${message}${metaStr}\n`;
	}
}

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
