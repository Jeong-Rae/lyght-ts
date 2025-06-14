import { Transport, LogLevel, ApmClient, Meta } from "../types";

export class ApmTransport implements Transport {
	constructor(private client: ApmClient) {}

	log(level: LogLevel, message: string, meta: Meta = {}): void {
		if (level === "error" && "error" in meta) {
			this.client.captureException(meta.error as Error);
		} else {
			this.client.captureMessage(message, { level });
		}
	}
}
