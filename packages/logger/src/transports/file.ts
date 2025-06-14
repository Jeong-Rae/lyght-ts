import fs from "fs";
import { Transport, LogLevel, Meta } from "../types";

const WRITE_FLAGS_APPEND = "a";

export class FileTransport implements Transport {
	private stream: fs.WriteStream;

	constructor(private filePath: string) {
		this.stream = fs.createWriteStream(filePath, { flags: WRITE_FLAGS_APPEND });
	}

	log(level: LogLevel, message: string, meta: Meta = {}): void {
		const timestamp = new Date().toISOString();
		const entry = `${timestamp} [${level.toUpperCase()}] ${message} ${JSON.stringify(meta)}\n`;
		this.stream.write(entry);
	}
}
