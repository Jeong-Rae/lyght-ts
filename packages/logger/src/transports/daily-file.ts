import fs from "fs";
import path from "path";
import { Transport, LogLevel, Meta } from "../types";
import { LogFormatter, DefaultFormatter } from "../formatters";
import {
	DEFAULT_MAX_DAYS,
	LOG_FILE_EXTENSION,
	FILE_APPEND_FLAG,
	DATE_FORMAT_REGEX,
} from "../constants";

export interface DailyFileTransportOptions {
	/** 로그 파일 디렉토리 */
	logDirectory: string;
	/** 파일명 패턴 (기본값: 'app') */
	fileNamePattern?: string;
	/** 날짜 포맷 (기본값: 'YYYY-MM-DD') */
	dateFormat?: string;
	/** 보관할 최대 일수 (기본값: 30일) */
	maxDays?: number;
	/** 로그 포맷터 */
	formatter?: LogFormatter;
}

export class DailyFileTransport implements Transport {
	private readonly logDirectory: string;
	private readonly fileNamePattern: string;
	private readonly maxDays: number;
	private readonly formatter: LogFormatter;
	private currentDate: string = "";
	private currentStream?: fs.WriteStream;
	private isClosed: boolean = false;

	constructor(options: DailyFileTransportOptions) {
		this.logDirectory = options.logDirectory;
		this.fileNamePattern = options.fileNamePattern ?? "app";
		this.maxDays = options.maxDays ?? DEFAULT_MAX_DAYS;
		this.formatter = options.formatter ?? new DefaultFormatter();

		this.ensureDirectoryExists();
		this.cleanupOldFiles();
	}

	private ensureDirectoryExists(): void {
		if (!fs.existsSync(this.logDirectory)) {
			fs.mkdirSync(this.logDirectory, { recursive: true });
		}
	}

	private formatDate(date: Date): string {
		return date.toISOString().split("T")[0]; // YYYY-MM-DD
	}

	private getCurrentFilePath(date: Date): string {
		const dateStr = this.formatDate(date);
		const fileName = `${this.fileNamePattern}-${dateStr}${LOG_FILE_EXTENSION}`;
		return path.join(this.logDirectory, fileName);
	}

	private ensureCurrentStream(date: Date): void {
		const dateStr = this.formatDate(date);

		if (this.currentDate !== dateStr) {
			// 날짜가 바뀌었으므로 새 스트림 생성
			if (this.currentStream) {
				this.currentStream.end();
			}

			this.currentDate = dateStr;
			const filePath = this.getCurrentFilePath(date);
			this.currentStream = fs.createWriteStream(filePath, {
				flags: FILE_APPEND_FLAG,
			});
		}
	}

	private cleanupOldFiles(): void {
		try {
			const files = fs.readdirSync(this.logDirectory);
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - this.maxDays);
			const cutoffDateStr = this.formatDate(cutoffDate);

			files
				.filter(
					(file) =>
						file.startsWith(this.fileNamePattern) &&
						file.endsWith(LOG_FILE_EXTENSION),
				)
				.forEach((file) => {
					const match = file.match(DATE_FORMAT_REGEX);
					if (match) {
						const fileDate = match[1];
						if (fileDate < cutoffDateStr) {
							const filePath = path.join(this.logDirectory, file);
							fs.unlinkSync(filePath);
						}
					}
				});
		} catch (error) {
			// 파일 정리 실패는 무시
		}
	}

	log(level: LogLevel, message: string, meta: Meta = {}): void {
		if (this.isClosed) {
			return; // 닫힌 transport는 무시
		}

		const timestamp = new Date();
		this.ensureCurrentStream(timestamp);

		if (this.currentStream) {
			const formattedEntry = this.formatter.format(
				level,
				message,
				meta,
				timestamp,
			);
			try {
				this.currentStream.write(formattedEntry);
			} catch (error) {
				// 스트림 쓰기 실패는 무시
			}
		}
	}

	/**
	 * 현재 스트림을 닫고 리소스를 정리합니다.
	 */
	close(): void {
		if (!this.isClosed) {
			this.isClosed = true;
			if (this.currentStream) {
				this.currentStream.end();
				this.currentStream = undefined;
			}
		}
	}

	/**
	 * 오래된 로그 파일들을 수동으로 정리합니다.
	 */
	manualCleanup(): void {
		this.cleanupOldFiles();
	}
}
