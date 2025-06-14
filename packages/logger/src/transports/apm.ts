import { Transport, LogLevel, Meta } from "../types";
import { now } from "../utils/datetime";

// APM 클라이언트 타입 정의
interface ApmClient {
	captureException(error: Error, options?: any): void;
	captureMessage(message: string, options?: any): void;
}

export interface ApmTransportOptions {
	apmClient: ApmClient;
	captureLevel?: LogLevel;
}

/**
 * APM(Application Performance Monitoring)에 로그를 전송하는 Transport
 */
export class ApmTransport implements Transport {
	private readonly apmClient: ApmClient;
	private readonly captureLevel: LogLevel;

	constructor(options: ApmTransportOptions) {
		this.apmClient = options.apmClient;
		this.captureLevel = options.captureLevel ?? "error";
	}

	log(
		level: LogLevel,
		message: string,
		meta: Meta = {},
		timestamp: Date = now(),
	): void {
		// 설정된 레벨 이상일 때만 APM에 전송
		if (!this.shouldCapture(level)) {
			return;
		}

		const apmMeta = {
			...meta,
			level,
			timestamp: timestamp.toISOString(),
		};

		// Error 객체가 있으면 exception으로, 없으면 message로 전송
		if (meta.error instanceof Error) {
			this.apmClient.captureException(meta.error, apmMeta);
		} else {
			this.apmClient.captureMessage(message, apmMeta);
		}
	}

	private shouldCapture(level: LogLevel): boolean {
		const levels: Record<LogLevel, number> = {
			debug: 0,
			info: 1,
			warn: 2,
			error: 3,
		};

		return levels[level] >= levels[this.captureLevel];
	}
}
