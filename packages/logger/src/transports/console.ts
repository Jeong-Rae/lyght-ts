import { Transport, LogLevel, Meta } from "../types";

export class ConsoleTransport implements Transport {
	log(level: LogLevel, message: string, meta: Meta = {}): void {
		const timestamp = new Date().toISOString();
		const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
		switch (level) {
			case "debug":
				console.debug(prefix, message, meta);
				break;
			case "info":
				console.info(prefix, message, meta);
				break;
			case "warn":
				console.warn(prefix, message, meta);
				break;
			case "error":
				console.error(prefix, message, meta);
				break;
		}
	}
}
