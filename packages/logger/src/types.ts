export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export type Meta = Record<string, unknown>;

export interface Transport {
	log(level: LogLevel, message: string, meta?: Meta): void;
}

export interface ApmClient {
	captureException(error: Error): void;
	captureMessage(message: string, options?: { level: LogLevel }): void;
}
