import fs from "fs";
import path from "path";
import { createGzip } from "zlib";

/**
 * 파일 정보 인터페이스
 */
export interface FileInfo {
	path: string;
	size: number;
	exists: boolean;
	isDirectory: boolean;
	isFile: boolean;
	createdAt?: Date;
	modifiedAt?: Date;
}

/**
 * 디렉토리 생성 옵션
 */
export interface CreateDirectoryOptions {
	recursive?: boolean;
	mode?: number;
}

/**
 * 파일 스트림 생성 옵션
 */
export interface CreateStreamOptions {
	flags?: string;
	encoding?: BufferEncoding;
	mode?: number;
	autoClose?: boolean;
	start?: number;
	end?: number;
}

/**
 * 파일 압축 옵션
 */
export interface CompressFileOptions {
	deleteOriginal?: boolean;
	level?: number;
}

/**
 * 파일 또는 디렉토리가 존재하는지 확인합니다.
 */
export function exists(filePath: string): boolean {
	try {
		return fs.existsSync(filePath);
	} catch {
		return false;
	}
}

/**
 * 파일 정보를 가져옵니다.
 */
export function getFileInfo(filePath: string): FileInfo {
	const fileExists = exists(filePath);

	if (!fileExists) {
		return {
			path: filePath,
			size: 0,
			exists: false,
			isDirectory: false,
			isFile: false,
		};
	}

	try {
		const stats = fs.statSync(filePath);
		return {
			path: filePath,
			size: stats.size,
			exists: true,
			isDirectory: stats.isDirectory(),
			isFile: stats.isFile(),
			createdAt: stats.birthtime,
			modifiedAt: stats.mtime,
		};
	} catch {
		return {
			path: filePath,
			size: 0,
			exists: false,
			isDirectory: false,
			isFile: false,
		};
	}
}

/**
 * 파일 크기를 가져옵니다.
 */
export function getFileSize(filePath: string): number {
	return getFileInfo(filePath).size;
}

/**
 * 디렉토리를 생성합니다.
 */
export function createDirectory(
	dirPath: string,
	options: CreateDirectoryOptions = { recursive: true },
): boolean {
	try {
		if (exists(dirPath)) {
			return true;
		}
		fs.mkdirSync(dirPath, options);
		return true;
	} catch {
		return false;
	}
}

/**
 * 디렉토리를 안전하게 생성합니다 (존재하지 않을 때만).
 */
export function ensureDirectory(dirPath: string): boolean {
	if (exists(dirPath)) {
		return true;
	}
	return createDirectory(dirPath);
}

/**
 * 파일의 디렉토리를 생성합니다.
 */
export function ensureFileDirectory(filePath: string): boolean {
	const dir = path.dirname(filePath);
	return ensureDirectory(dir);
}

/**
 * 쓰기 스트림을 생성합니다.
 */
export function createWriteStream(
	filePath: string,
	options: CreateStreamOptions = { flags: "a" },
): fs.WriteStream {
	ensureFileDirectory(filePath);
	return fs.createWriteStream(filePath, options);
}

/**
 * 읽기 스트림을 생성합니다.
 */
export function createReadStream(
	filePath: string,
	options: CreateStreamOptions = {},
): fs.ReadStream {
	return fs.createReadStream(filePath, options);
}

/**
 * 디렉토리의 파일 목록을 가져옵니다.
 */
export function listFiles(dirPath: string): string[] {
	try {
		if (!exists(dirPath)) {
			return [];
		}
		return fs.readdirSync(dirPath);
	} catch {
		return [];
	}
}

/**
 * 패턴에 맞는 파일들을 필터링합니다.
 */
export function listFilesWithPattern(
	dirPath: string,
	pattern: RegExp,
): string[] {
	return listFiles(dirPath).filter((file) => pattern.test(file));
}

/**
 * 파일을 삭제합니다.
 */
export function deleteFile(filePath: string): boolean {
	try {
		if (!exists(filePath)) {
			return true;
		}
		fs.unlinkSync(filePath);
		return true;
	} catch {
		return false;
	}
}

/**
 * 파일을 이동/이름 변경합니다.
 */
export function moveFile(oldPath: string, newPath: string): boolean {
	try {
		if (!exists(oldPath)) {
			return false;
		}
		ensureFileDirectory(newPath);
		fs.renameSync(oldPath, newPath);
		return true;
	} catch {
		return false;
	}
}

/**
 * 파일을 복사합니다.
 */
export function copyFile(sourcePath: string, destPath: string): boolean {
	try {
		if (!exists(sourcePath)) {
			return false;
		}
		ensureFileDirectory(destPath);
		fs.copyFileSync(sourcePath, destPath);
		return true;
	} catch {
		return false;
	}
}

/**
 * 파일을 압축합니다.
 */
export async function compressFile(
	filePath: string,
	options: CompressFileOptions = {},
): Promise<boolean> {
	return new Promise((resolve) => {
		try {
			if (!exists(filePath)) {
				resolve(false);
				return;
			}

			const gzipPath = `${filePath}.gz`;
			const readStream = createReadStream(filePath);
			const writeStream = createWriteStream(gzipPath);
			const gzip = createGzip({ level: options.level });

			readStream
				.pipe(gzip)
				.pipe(writeStream)
				.on("finish", () => {
					if (options.deleteOriginal) {
						deleteFile(filePath);
					}
					resolve(true);
				})
				.on("error", () => {
					resolve(false);
				});
		} catch {
			resolve(false);
		}
	});
}

/**
 * 여러 파일을 안전하게 삭제합니다.
 */
export function deleteFiles(filePaths: string[]): {
	success: string[];
	failed: string[];
} {
	const success: string[] = [];
	const failed: string[] = [];

	for (const filePath of filePaths) {
		if (deleteFile(filePath)) {
			success.push(filePath);
		} else {
			failed.push(filePath);
		}
	}

	return { success, failed };
}

/**
 * 파일 경로를 정규화합니다.
 */
export function normalizePath(filePath: string): string {
	return path.normalize(filePath);
}

/**
 * 파일 경로를 결합합니다.
 */
export function joinPath(...paths: string[]): string {
	return path.join(...paths);
}

/**
 * 파일의 확장자를 가져옵니다.
 */
export function getExtension(filePath: string): string {
	return path.extname(filePath);
}

/**
 * 파일명(확장자 제외)을 가져옵니다.
 */
export function getBaseName(filePath: string): string {
	return path.basename(filePath, getExtension(filePath));
}

/**
 * 디렉토리 경로를 가져옵니다.
 */
export function getDirectory(filePath: string): string {
	return path.dirname(filePath);
}
