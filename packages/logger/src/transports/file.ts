import fs from "fs";
import path from "path";
import zlib from "zlib";
import { Transport, LogLevel, Meta } from "../types";
import { LogFormatter, DefaultFormatter } from "../formatters";
import { globalBackgroundQueue } from "../utils/background-queue";
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

export class FileTransport implements Transport {
	private stream!: fs.WriteStream;
	private readonly filePath: string;
	private readonly maxFileSize: number;
	private readonly maxFiles: number;
	private readonly compress: boolean;
	private readonly formatter: LogFormatter;
	private currentFileSize: number = 0;
	private isClosed: boolean = false;

	constructor(options: string | FileTransportOptions) {
		// 문자열인 경우 기본 옵션 적용
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

		this.ensureDirectoryExists();
		this.initializeStream();
	}

	private ensureDirectoryExists(): void {
		const dir = path.dirname(this.filePath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
	}

	private initializeStream(): void {
		// 현재 파일 크기 확인
		try {
			const stats = fs.statSync(this.filePath);
			this.currentFileSize = stats.size;
		} catch {
			this.currentFileSize = 0;
		}

		this.stream = fs.createWriteStream(this.filePath, {
			flags: FILE_APPEND_FLAG,
		});
	}

	private async rotateFile(): Promise<void> {
		// 현재 스트림 닫기
		await new Promise<void>((resolve) => {
			this.stream.end(resolve);
		});

		// 기존 회전된 파일들 정리
		await this.cleanupOldFiles();

		// 현재 파일을 .1로 이동
		const rotatedPath = `${this.filePath}.1`;
		if (fs.existsSync(this.filePath)) {
			fs.renameSync(this.filePath, rotatedPath);

			// 압축 활성화된 경우 압축
			if (this.compress) {
				await this.compressFile(rotatedPath);
			}
		}

		// 새 스트림 초기화
		this.initializeStream();
	}

	private async compressFile(filePath: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const input = fs.createReadStream(filePath);
			const output = fs.createWriteStream(`${filePath}.gz`);
			const gzip = zlib.createGzip();

			input
				.pipe(gzip)
				.pipe(output)
				.on("finish", () => {
					// 원본 파일 삭제
					fs.unlinkSync(filePath);
					resolve();
				})
				.on("error", reject);
		});
	}

	private async cleanupOldFiles(): Promise<void> {
		const dir = path.dirname(this.filePath);
		const fileName = path.basename(this.filePath);
		const extension = this.compress ? GZIP_FILE_EXTENSION : "";

		try {
			const files = fs.readdirSync(dir);
			const logFiles = files
				.filter((file) => file.startsWith(`${fileName}.`))
				.map((file) => ({
					name: file,
					path: path.join(dir, file),
					number: this.extractFileNumber(file),
				}))
				.filter((file) => file.number > 0)
				.sort((a, b) => a.number - b.number);

			// 기존 파일들을 번호 순서대로 이동
			for (let i = logFiles.length - 1; i >= 0; i--) {
				const file = logFiles[i];
				const newNumber = file.number + 1;
				const newPath = path.join(dir, `${fileName}.${newNumber}${extension}`);

				if (newNumber > this.maxFiles) {
					// 최대 파일 수를 초과하면 삭제
					fs.unlinkSync(file.path);
				} else {
					// 파일 번호 증가시켜 이동
					fs.renameSync(file.path, newPath);
				}
			}
		} catch (error) {
			// 디렉토리 읽기 실패는 무시 (파일이 없을 수 있음)
		}
	}

	private extractFileNumber(fileName: string): number {
		const match = fileName.match(FILE_NUMBER_REGEX);
		return match ? parseInt(match[1], 10) : 0;
	}

	log(level: LogLevel, message: string, meta: Meta = {}): void {
		if (this.isClosed) {
			return; // 닫힌 transport는 무시
		}

		const timestamp = new Date();
		const entry = this.formatter.format(level, message, meta, timestamp);
		const entrySize = Buffer.byteLength(entry);

		// 파일 크기 체크 후 필요시 백그라운드에서 회전
		if (this.currentFileSize + entrySize > this.maxFileSize) {
			globalBackgroundQueue.enqueue(() => this.rotateFile());
		}

		// 로그 즉시 작성
		try {
			this.stream.write(entry);
			this.currentFileSize += entrySize;
		} catch (error) {
			// 스트림 쓰기 실패는 무시 (로깅 무한루프 방지)
		}
	}

	/**
	 * 스트림을 닫고 리소스를 정리합니다.
	 */
	close(): void {
		if (!this.isClosed) {
			this.isClosed = true;
			this.stream.end();
		}
	}
}
