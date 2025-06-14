import { Transport, LogLevel, Meta } from "../types";
import { LogFormatter, DefaultFormatter } from "../formatters";
import { now } from "../utils/datetime";

export interface ConsoleTransportOptions {
	formatter?: LogFormatter;
}

/**
 * 콘솔에 로그를 출력하는 Transport
 */
export class ConsoleTransport implements Transport {
	private readonly formatter: LogFormatter;

	constructor(options: ConsoleTransportOptions = {}) {
		this.formatter = options.formatter ?? new DefaultFormatter();
	}

	log(
		level: LogLevel,
		message: string,
		meta: Meta = {},
		timestamp: Date = now(),
	): void {
		const formattedMessage = this.formatter.format(
			level,
			message,
			meta,
			timestamp,
		);

		switch (level) {
			case "debug":
				console.debug(formattedMessage.trim());
				break;
			case "info":
				console.info(formattedMessage.trim());
				break;
			case "warn":
				console.warn(formattedMessage.trim());
				break;
			case "error":
				console.error(formattedMessage.trim());
				break;
		}
	}
}
