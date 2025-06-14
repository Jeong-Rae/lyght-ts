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
import {
	toDateString,
	isOlderThan,
	extractDateFromFilename,
	now,
} from "../utils/datetime";

export interface DailyFileTransportOptions {
	/** 로그 파일 디렉토리 */
	logDirectory: string;
	/** 파일명 패턴 (기본값: 'app') */
	fileNamePattern?: string;
	/** 보관할 최대 일수 (기본값: 30일) */
	maxDays?: number;
	/** 로그 포맷터 */
	formatter?: LogFormatter;
}

/**
 * 날짜별로 로그 파일을 생성하는 Transport
 */
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

		// 디렉토리 생성
		if (!fs.existsSync(this.logDirectory)) {
			fs.mkdirSync(this.logDirectory, { recursive: true });
		}

		// 초기 정리 작업
		this.cleanupOldFiles();
	}

	private formatDate(date: Date): string {
		return toDateString(date);
	}

	private getCurrentFilePath(date: Date): string {
		const formattedDate = this.formatDate(date);
		return path.join(
			this.logDirectory,
			`${this.fileNamePattern}-${formattedDate}${LOG_FILE_EXTENSION}`,
		);
	}

	private ensureCurrentStream(date: Date): void {
		const formattedDate = this.formatDate(date);

		if (this.currentDate !== formattedDate) {
			// 날짜가 바뀌었으므로 새 스트림 생성
			if (this.currentStream) {
				this.currentStream.end();
			}

			this.currentDate = formattedDate;
			const filePath = this.getCurrentFilePath(date);
			this.currentStream = fs.createWriteStream(filePath, {
				flags: FILE_APPEND_FLAG,
			});
		}
	}

	private cleanupOldFiles(): void {
		try {
			const files = fs.readdirSync(this.logDirectory);
			const currentDate = now();

			files
				.filter(
					(file) =>
						file.startsWith(this.fileNamePattern) &&
						file.endsWith(LOG_FILE_EXTENSION),
				)
				.forEach((file) => {
					const match = file.match(DATE_FORMAT_REGEX);
					if (match) {
						const fileDate = extractDateFromFilename(file);
						if (fileDate && isOlderThan(fileDate, this.maxDays, currentDate)) {
							const filePath = path.join(this.logDirectory, file);
							fs.unlinkSync(filePath);
						}
					}
				});
		} catch (error) {
			// 실패는 무시
		}
	}

	/**
	 * 수동 정리
	 */
	manualCleanup(): void {
		this.cleanupOldFiles();
	}

	log(
		level: LogLevel,
		message: string,
		meta: Meta = {},
		timestamp: Date = now(),
	): void {
		if (this.isClosed) {
			return;
		}

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
				// 스트림 쓰기 실패 시 무시
			}
		}
	}

	/**
	 * 현재 스트림 닫기
	 */
	close(): void {
		if (this.isClosed) {
			return;
		}

		this.isClosed = true;
		if (this.currentStream) {
			this.currentStream.end();
			this.currentStream = undefined;
		}
	}
}
