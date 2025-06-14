import { LOG_LEVELS, LogLevel, Meta, Transport } from "./types";

export class Logger {
	private static transports: Transport[] = [];

	private static getLevel(): LogLevel {
		const level = process.env.LOG_LEVEL as LogLevel | undefined;
		return LOG_LEVELS.includes(level as LogLevel)
			? (level as LogLevel)
			: LOG_LEVELS[0];
	}

	private static shouldLog(level: LogLevel): boolean {
		const current = this.getLevel();
		return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(current);
	}

	static useTransports(...args: Transport[]) {
		this.transports = args;
	}

	private static log(level: LogLevel, message: string, meta: Meta = {}) {
		if (!this.shouldLog(level)) return;
		this.transports.forEach((transport) => transport.log(level, message, meta));
	}

	static debug(message: string, meta?: Meta) {
		this.log("debug", message, meta);
	}

	static info(message: string, meta?: Meta) {
		this.log("info", message, meta);
	}

	static warn(message: string, meta?: Meta) {
		this.log("warn", message, meta);
	}

	static error(errOrMsg: string | Error, meta: Meta = {}) {
		const message = errOrMsg instanceof Error ? errOrMsg.message : errOrMsg;
		const finalMeta = {
			...meta,
			...(errOrMsg instanceof Error ? { error: errOrMsg } : {}),
		};
		this.log("error", message, finalMeta);
	}
}
