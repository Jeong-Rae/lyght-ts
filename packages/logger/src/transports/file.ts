import fs from "fs";
import path from "path";
import zlib from "zlib";
import { Transport, LogLevel, Meta } from "../types";
import { LogFormatter, DefaultFormatter } from "../formatters";
import { globalBackgroundQueue } from "../utils/background-queue";
import { now } from "../utils/datetime";
import {
	DEFAULT_MAX_FILE_SIZE,
	DEFAULT_MAX_FILES,
	FILE_APPEND_FLAG,
	GZIP_FILE_EXTENSION,
	FILE_NUMBER_REGEX,
} from "../constants";

export interface FileTransportOptions {
	/** 로그 파일 경로 */
	filePath: string;
	/** 최대 파일 크기 (bytes, 기본값: 10MB) */
	maxFileSize?: number;
	/** 보관할 최대 파일 개수 (기본값: 5) */
	maxFiles?: number;
	/** 압축 활성화 여부 (기본값: true) */
	compress?: boolean;
	/** 로그 포맷터 */
	formatter?: LogFormatter;
}

/**
 * 파일에 로그를 저장하는 Transport
 */
export class FileTransport implements Transport {
	private readonly filePath: string;
	private readonly maxFileSize: number;
	private readonly maxFiles: number;
	private readonly compress: boolean;
	private readonly formatter: LogFormatter;
	private stream: fs.WriteStream;
	private currentFileSize: number = 0;
	private isClosed: boolean = false;

	constructor(options: string | FileTransportOptions) {
		if (typeof options === "string") {
			this.filePath = options;
			this.maxFileSize = DEFAULT_MAX_FILE_SIZE;
			this.maxFiles = DEFAULT_MAX_FILES;
			this.compress = true;
			this.formatter = new DefaultFormatter();
		} else {
			this.filePath = options.filePath;
			this.maxFileSize = options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
			this.maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
			this.compress = options.compress ?? true;
			this.formatter = options.formatter ?? new DefaultFormatter();
		}

		// 디렉토리 생성
		const dir = path.dirname(this.filePath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		// 현재 파일 크기 확인
		try {
			const stats = fs.statSync(this.filePath);
			this.currentFileSize = stats.size;
		} catch (error) {
			this.currentFileSize = 0;
		}

		this.stream = fs.createWriteStream(this.filePath, {
			flags: FILE_APPEND_FLAG,
		});
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

		const formattedEntry = this.formatter.format(
			level,
			message,
			meta,
			timestamp,
		);

		// 파일 크기 체크 및 회전
		if (
			this.currentFileSize + Buffer.byteLength(formattedEntry) >
			this.maxFileSize
		) {
			globalBackgroundQueue.enqueue(() => this.rotateFile());
		}

		// 즉시 로그 작성
		try {
			this.stream.write(formattedEntry);
			this.currentFileSize += Buffer.byteLength(formattedEntry);
		} catch (error) {
			// 스트림 쓰기 실패 시 무시
		}
	}

	private async rotateFile(): Promise<void> {
		try {
			// 현재 스트림 종료
			await new Promise<void>((resolve) => {
				this.stream.end(() => resolve());
			});

			// 기존 파일들의 번호 확인
			const dir = path.dirname(this.filePath);
			const basename = path.basename(this.filePath);
			const files = fs.readdirSync(dir);

			const existingNumbers = files
				.map((file) => this.extractFileNumber(file, basename))
				.filter((num): num is number => num !== null)
				.sort((a, b) => b - a);

			// 파일 회전
			for (const num of existingNumbers) {
				const oldPath = this.getRotatedFilePath(num);
				const newPath = this.getRotatedFilePath(num + 1);

				if (num + 1 > this.maxFiles) {
					// 최대 파일 수 초과 시 삭제
					if (fs.existsSync(oldPath)) {
						fs.unlinkSync(oldPath);
					}
				} else {
					// 파일 이름 변경
					if (fs.existsSync(oldPath)) {
						fs.renameSync(oldPath, newPath);
					}
				}
			}

			// 현재 파일을 .1로 이동
			if (fs.existsSync(this.filePath)) {
				const rotatedPath = this.getRotatedFilePath(1);
				fs.renameSync(this.filePath, rotatedPath);

				// 압축 처리
				if (this.compress) {
					await this.compressFile(rotatedPath);
				}
			}

			// 새 스트림 생성
			this.stream = fs.createWriteStream(this.filePath, {
				flags: FILE_APPEND_FLAG,
			});
			this.currentFileSize = 0;
		} catch (error) {
			// 회전 실패 시 무시
		}
	}

	private extractFileNumber(filename: string, basename: string): number | null {
		if (!filename.startsWith(basename)) {
			return null;
		}

		const match = filename.match(FILE_NUMBER_REGEX);
		return match ? parseInt(match[1], 10) : null;
	}

	private getRotatedFilePath(number: number): string {
		const extension = this.compress ? GZIP_FILE_EXTENSION : "";
		return `${this.filePath}.${number}${extension}`;
	}

	private async compressFile(filePath: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const gzipPath = `${filePath}${GZIP_FILE_EXTENSION}`;
			const readStream = fs.createReadStream(filePath);
			const writeStream = fs.createWriteStream(gzipPath);
			const gzip = zlib.createGzip();

			readStream
				.pipe(gzip)
				.pipe(writeStream)
				.on("finish", () => {
					// 원본 파일 삭제
					fs.unlinkSync(filePath);
					resolve();
				})
				.on("error", reject);
		});
	}

	close(): void {
		if (this.isClosed) {
			return;
		}

		this.isClosed = true;
		this.stream.end();
	}
}
