import path from "path";
import { Transport, LogLevel, Meta } from "../types";
import { LogFormatter, DefaultFormatter } from "../formatters";
import { globalBackgroundQueue } from "../utils/background-queue";
import { now } from "../utils/datetime";
import {
	DEFAULT_MAX_FILE_SIZE,
	DEFAULT_MAX_FILES,
	DEFAULT_MAX_DAYS,
	FILE_APPEND_FLAG,
	GZIP_FILE_EXTENSION,
	FILE_NUMBER_REGEX,
	LOG_FILE_EXTENSION,
	DATE_FORMAT_REGEX,
} from "../constants";
import {
	exists,
	getFileSize,
	ensureFileDirectory,
	ensureDirectory,
	createWriteStream,
	listFiles,
	listFilesWithPattern,
	deleteFile,
	moveFile,
	compressFile,
	getDirectory,
	getBaseName,
	getExtension,
	joinPath,
} from "../utils/fs";
import {
	toDateString,
	isOlderThan,
	extractDateFromFilename,
} from "../utils/datetime";

/**
 * 롤링 기준 타입
 */
export type RotationTrigger = "size" | "date" | "hybrid";

/**
 * 파일 정리 기준
 */
export interface CleanupOptions {
	/** 보관할 최대 파일 개수 */
	maxFiles?: number;
	/** 보관할 최대 일수 */
	maxDays?: number;
}

export interface FileTransportOptions {
	/** 로그 파일 경로 (크기 기반) 또는 디렉토리 (날짜 기반) */
	filePath: string;
	/** 파일명 패턴 (날짜 기반 롤링 시 사용, 기본값: 'app') */
	fileNamePattern?: string;
	/** 롤링 기준 (기본값: 'size') */
	rotation?: RotationTrigger;
	/** 최대 파일 크기 (bytes, 기본값: 10MB) */
	maxFileSize?: number;
	/** 압축 활성화 여부 (기본값: true) */
	compress?: boolean;
	/** 파일 정리 옵션 */
	cleanup?: CleanupOptions;
	/** 로그 포맷터 */
	formatter?: LogFormatter;
}

/**
 * 파일에 로그를 저장하는 통합 Transport
 * 크기 기반, 날짜 기반, 또는 복합 롤링을 지원합니다.
 */
export class FileTransport implements Transport {
	private readonly filePath: string;
	private readonly fileNamePattern: string;
	private readonly rotation: RotationTrigger;
	private readonly maxFileSize: number;
	private readonly compress: boolean;
	private readonly maxFiles?: number;
	private readonly maxDays?: number;
	private readonly formatter: LogFormatter;

	// 크기 기반 롤링용
	private stream?: NodeJS.WritableStream;
	private currentFileSize: number = 0;

	// 날짜 기반 롤링용
	private currentDate: string = "";
	private currentStream?: NodeJS.WritableStream;

	private isClosed: boolean = false;

	constructor(options: string | FileTransportOptions) {
		if (typeof options === "string") {
			this.filePath = options;
			this.fileNamePattern = "app";
			this.rotation = "size";
			this.maxFileSize = DEFAULT_MAX_FILE_SIZE;
			this.compress = true;
			this.maxFiles = DEFAULT_MAX_FILES;
			this.formatter = new DefaultFormatter();
		} else {
			this.filePath = options.filePath;
			this.fileNamePattern = options.fileNamePattern ?? "app";
			this.rotation = options.rotation ?? "size";
			this.maxFileSize = options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
			this.compress = options.compress ?? true;
			this.maxFiles = options.cleanup?.maxFiles ?? DEFAULT_MAX_FILES;
			this.maxDays = options.cleanup?.maxDays ?? DEFAULT_MAX_DAYS;
			this.formatter = options.formatter ?? new DefaultFormatter();
		}

		this.initializeTransport();
	}

	private initializeTransport(): void {
		if (this.rotation === "date" || this.rotation === "hybrid") {
			// 날짜 기반 롤링: 디렉토리 생성
			ensureDirectory(this.filePath);
			this.cleanupOldFiles();
		} else {
			// 크기 기반 롤링: 파일 디렉토리 생성
			ensureFileDirectory(this.filePath);
			this.currentFileSize = getFileSize(this.filePath);
			this.stream = createWriteStream(this.filePath, {
				flags: FILE_APPEND_FLAG,
			});
		}
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

		if (this.rotation === "date") {
			this.handleDateBasedLogging(formattedEntry, timestamp);
		} else if (this.rotation === "size") {
			this.handleSizeBasedLogging(formattedEntry);
		} else if (this.rotation === "hybrid") {
			this.handleCombinedLogging(formattedEntry, timestamp);
		}
	}

	private handleSizeBasedLogging(formattedEntry: string): void {
		if (!this.stream) return;

		// 파일 크기 체크 및 회전
		if (
			this.currentFileSize + Buffer.byteLength(formattedEntry) >
			this.maxFileSize
		) {
			globalBackgroundQueue.enqueue(() => this.rotateSizeBasedFile());
		}

		// 즉시 로그 작성
		try {
			this.stream.write(formattedEntry);
			this.currentFileSize += Buffer.byteLength(formattedEntry);
		} catch (error) {
			// 스트림 쓰기 실패 시 무시
		}
	}

	private handleDateBasedLogging(
		formattedEntry: string,
		timestamp: Date,
	): void {
		this.ensureCurrentStream(timestamp);

		if (this.currentStream) {
			try {
				this.currentStream.write(formattedEntry);
			} catch (error) {
				// 스트림 쓰기 실패 시 무시
			}
		}
	}

	private handleCombinedLogging(formattedEntry: string, timestamp: Date): void {
		this.ensureCurrentStream(timestamp);

		if (this.currentStream) {
			// 날짜 기반 파일의 크기도 체크
			const currentFilePath = this.getCurrentFilePath(timestamp);
			const currentSize = getFileSize(currentFilePath);

			if (currentSize + Buffer.byteLength(formattedEntry) > this.maxFileSize) {
				// 크기 초과 시 해당 날짜 파일을 회전
				globalBackgroundQueue.enqueue(() =>
					this.rotateDateBasedFile(currentFilePath, timestamp),
				);
			}

			try {
				this.currentStream.write(formattedEntry);
			} catch (error) {
				// 스트림 쓰기 실패 시 무시
			}
		}
	}

	private ensureCurrentStream(date: Date): void {
		const formattedDate = toDateString(date);

		if (this.currentDate !== formattedDate) {
			// 날짜가 바뀌었으므로 새 스트림 생성
			if (this.currentStream) {
				this.currentStream.end();
			}

			this.currentDate = formattedDate;
			const filePath = this.getCurrentFilePath(date);
			try {
				this.currentStream = createWriteStream(filePath, {
					flags: FILE_APPEND_FLAG,
				});
			} catch (error) {
				// 스트림 생성 실패 시 무시
				this.currentStream = undefined;
			}
		}
	}

	private getCurrentFilePath(date: Date): string {
		const formattedDate = toDateString(date);
		return path.join(
			this.filePath,
			`${this.fileNamePattern}-${formattedDate}${LOG_FILE_EXTENSION}`,
		);
	}

	private async rotateSizeBasedFile(): Promise<void> {
		try {
			if (!this.stream) return;

			// 현재 스트림 종료
			await new Promise<void>((resolve) => {
				this.stream!.end(() => resolve());
			});

			// 기존 파일들의 번호 확인
			const dir = getDirectory(this.filePath);
			const basename = getBaseName(this.filePath) + getExtension(this.filePath);
			const files = listFiles(dir);

			const existingNumbers = files
				.map((file: string) => this.extractFileNumber(file, basename))
				.filter((num): num is number => num !== null)
				.sort((a: number, b: number) => b - a);

			// 파일 회전
			for (const num of existingNumbers) {
				const oldPath = this.getRotatedFilePath(num);
				const newPath = this.getRotatedFilePath(num + 1);

				if (this.maxFiles && num + 1 > this.maxFiles) {
					// 최대 파일 수 초과 시 삭제
					deleteFile(oldPath);
				} else {
					// 파일 이름 변경
					moveFile(oldPath, newPath);
				}
			}

			// 현재 파일을 .1로 이동
			if (exists(this.filePath)) {
				const rotatedPath = this.getRotatedFilePath(1);
				moveFile(this.filePath, rotatedPath);

				// 압축 처리
				if (this.compress) {
					await compressFile(rotatedPath, { deleteOriginal: true });
				}
			}

			// 새 스트림 생성
			this.stream = createWriteStream(this.filePath, {
				flags: FILE_APPEND_FLAG,
			});
			this.currentFileSize = 0;
		} catch (error) {
			// 회전 실패 시 무시
		}
	}

	private async rotateDateBasedFile(
		filePath: string,
		timestamp: Date,
	): Promise<void> {
		try {
			// 현재 스트림이 해당 파일을 사용 중이면 종료
			if (
				this.currentStream &&
				this.getCurrentFilePath(timestamp) === filePath
			) {
				this.currentStream.end();
				this.currentStream = undefined;
				this.currentDate = "";
			}

			// 파일 회전 (날짜 기반 파일에 번호 추가)
			const dir = getDirectory(filePath);
			const basename = getBaseName(filePath);
			const extension = getExtension(filePath);

			let rotationNumber = 1;
			let rotatedPath = path.join(
				dir,
				`${basename}.${rotationNumber}${extension}`,
			);

			// 사용 가능한 번호 찾기
			while (exists(rotatedPath)) {
				rotationNumber++;
				rotatedPath = path.join(
					dir,
					`${basename}.${rotationNumber}${extension}`,
				);
			}

			// 파일 이동
			moveFile(filePath, rotatedPath);

			// 압축 처리
			if (this.compress) {
				await compressFile(rotatedPath, { deleteOriginal: true });
			}

			// 새 스트림 생성 (다음 로그를 위해)
			this.ensureCurrentStream(timestamp);
		} catch (error) {
			// 회전 실패 시 무시
		}
	}

	private cleanupOldFiles(): void {
		try {
			if (this.maxDays) {
				// 날짜 기반 정리
				const pattern = new RegExp(
					`^${this.fileNamePattern}-.*${LOG_FILE_EXTENSION}$`,
				);
				const files = listFilesWithPattern(this.filePath, pattern);
				const currentDate = now();

				files.forEach((file: string) => {
					const match = file.match(DATE_FORMAT_REGEX);
					if (match) {
						const fileDate = extractDateFromFilename(file);
						if (fileDate && isOlderThan(fileDate, this.maxDays!, currentDate)) {
							const filePath = joinPath(this.filePath, file);
							deleteFile(filePath);
						}
					}
				});
			}

			if (
				this.maxFiles &&
				(this.rotation === "size" || this.rotation === "hybrid")
			) {
				// 파일 개수 기반 정리 (크기 기반 롤링 파일들)
				const dir =
					this.rotation === "size"
						? getDirectory(this.filePath)
						: this.filePath;
				const files = listFiles(dir);

				// 번호가 있는 파일들 찾기
				const numberedFiles = files
					.map((file: string) => {
						const match = file.match(FILE_NUMBER_REGEX);
						return match ? { file, number: parseInt(match[1], 10) } : null;
					})
					.filter(
						(item): item is { file: string; number: number } => item !== null,
					)
					.sort((a, b) => b.number - a.number);

				// 최대 개수 초과 파일 삭제
				numberedFiles.slice(this.maxFiles).forEach(({ file }) => {
					const filePath = path.join(dir, file);
					deleteFile(filePath);
				});
			}
		} catch (error) {
			// 실패는 무시
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

	/**
	 * 수동으로 오래된 파일들을 정리합니다.
	 */
	manualCleanup(): void {
		this.cleanupOldFiles();
	}

	close(): void {
		if (this.isClosed) {
			return;
		}

		this.isClosed = true;

		if (this.stream) {
			this.stream.end();
		}

		if (this.currentStream) {
			this.currentStream.end();
			this.currentStream = undefined;
		}
	}
}
