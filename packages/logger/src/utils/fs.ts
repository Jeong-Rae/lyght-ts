import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

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

export type BufferEncoding =
  | 'ascii'
  | 'utf8'
  | 'utf-8'
  | 'utf16le'
  | 'ucs2'
  | 'ucs-2'
  | 'base64'
  | 'base64url'
  | 'latin1'
  | 'binary'
  | 'hex';

/**
 * 버퍼 인코딩 타입
 */
export type BufferEncoding =
  | 'ascii'
  | 'utf8'
  | 'utf-8'
  | 'utf16le'
  | 'ucs2'
  | 'ucs-2'
  | 'base64'
  | 'base64url'
  | 'latin1'
  | 'binary'
  | 'hex';

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
 * @param {string} filePath - 확인할 파일 또는 디렉토리 경로
 * @returns {boolean} 파일이 존재하면 true, 그렇지 않으면 false
 * @example
 * ```typescript
 * exists('/path/to/file.txt'); // true 또는 false
 * ```
 */
export function exists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * 파일의 상세 정보를 가져옵니다.
 * @param {string} filePath - 정보를 가져올 파일 경로
 * @returns {FileInfo} 파일 정보 객체
 * @example
 * ```typescript
 * getFileInfo('/path/to/file.txt');
 * // {
 * //   path: '/path/to/file.txt',
 * //   size: 1024,
 * //   exists: true,
 * //   isDirectory: false,
 * //   isFile: true,
 * //   createdAt: Date,
 * //   modifiedAt: Date
 * // }
 * ```
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
 * 파일의 크기를 바이트 단위로 가져옵니다.
 * @param {string} filePath - 크기를 확인할 파일 경로
 * @returns {number} 파일 크기 (바이트), 파일이 없으면 0
 * @example
 * ```typescript
 * getFileSize('/path/to/file.txt'); // 1024 (바이트)
 * ```
 */
export function getFileSize(filePath: string): number {
  return getFileInfo(filePath).size;
}

/**
 * 디렉토리를 생성합니다.
 * @param {string} dirPath - 생성할 디렉토리 경로
 * @param {CreateDirectoryOptions} [options={ recursive: true }] - 디렉토리 생성 옵션
 * @returns {boolean} 생성 성공 시 true, 실패 시 false
 * @example
 * ```typescript
 * createDirectory('/path/to/new/directory'); // true
 *
 * // 재귀적으로 생성하지 않기
 * createDirectory('/path/to/dir', { recursive: false });
 * ```
 */
export function createDirectory(dirPath: string, options: CreateDirectoryOptions = { recursive: true }): boolean {
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
 * 디렉토리를 안전하게 생성합니다 (이미 존재하면 생성하지 않음).
 * @param {string} dirPath - 생성할 디렉토리 경로
 * @returns {boolean} 디렉토리가 존재하거나 생성 성공 시 true
 * @example
 * ```typescript
 * ensureDirectory('/logs'); // true (이미 존재하거나 새로 생성됨)
 * ```
 */
export function ensureDirectory(dirPath: string): boolean {
  if (exists(dirPath)) {
    return true;
  }
  return createDirectory(dirPath);
}

/**
 * 파일의 상위 디렉토리를 생성합니다.
 * @param {string} filePath - 파일 경로
 * @returns {boolean} 디렉토리 생성 성공 시 true
 * @example
 * ```typescript
 * ensureFileDirectory('/logs/app.log'); // true (/logs 디렉토리가 생성됨)
 * ```
 */
export function ensureFileDirectory(filePath: string): boolean {
  const dir = path.dirname(filePath);
  return ensureDirectory(dir);
}

/**
 * 파일 쓰기 스트림을 생성합니다.
 * @param {string} filePath - 스트림을 생성할 파일 경로
 * @param {CreateStreamOptions} [options={ flags: "a" }] - 스트림 생성 옵션
 * @returns {fs.WriteStream} 파일 쓰기 스트림
 * @example
 * ```typescript
 * createWriteStream('/logs/app.log');
 *
 * createWriteStream('/logs/app.log', { flags: 'w' });
 * ```
 */
export function createWriteStream(filePath: string, options: CreateStreamOptions = { flags: 'a' }): fs.WriteStream {
  ensureFileDirectory(filePath);
  return fs.createWriteStream(filePath, options);
}

/**
 * 파일 읽기 스트림을 생성합니다.
 * @param {string} filePath - 스트림을 생성할 파일 경로
 * @param {CreateStreamOptions} [options={}] - 스트림 생성 옵션
 * @returns {fs.ReadStream} 파일 읽기 스트림
 * @example
 * ```typescript
 * createReadStream('/logs/app.log');
 *
 * createReadStream('/logs/app.log', { start: 0, end: 100 });
 * ```
 */
export function createReadStream(filePath: string, options: CreateStreamOptions = {}): fs.ReadStream {
  return fs.createReadStream(filePath, options);
}

/**
 * 디렉토리의 파일 목록을 가져옵니다.
 * @param {string} dirPath - 파일 목록을 가져올 디렉토리 경로
 * @returns {string[]} 파일명 배열, 디렉토리가 없거나 오류 시 빈 배열
 * @example
 * ```typescript
 * listFiles('/logs'); // ['app.log', 'error.log', 'debug.log']
 * ```
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
 * 정규식 패턴에 맞는 파일들을 필터링하여 반환합니다.
 * @param {string} dirPath - 검색할 디렉토리 경로
 * @param {RegExp} pattern - 파일명 필터링에 사용할 정규식
 * @returns {string[]} 패턴에 맞는 파일명 배열
 * @example
 * ```typescript
 * listFilesWithPattern('/logs', /\.log$/); // ['app.log', 'error.log']
 *
 * listFilesWithPattern('/logs', /app-\d{4}-\d{2}-\d{2}\.log/); // ['app-2024-01-01.log', 'app-2024-01-02.log']
 * ```
 */
export function listFilesWithPattern(dirPath: string, pattern: RegExp): string[] {
  return listFiles(dirPath).filter((file) => pattern.test(file));
}

/**
 * 파일을 삭제합니다.
 * @param {string} filePath - 삭제할 파일 경로
 * @returns {boolean} 삭제 성공 시 true, 파일이 없거나 실패 시 false
 * @example
 * ```typescript
 * deleteFile('/temp/old-file.txt'); // true (삭제 성공)
 * ```
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
 * 파일을 이동하거나 이름을 변경합니다.
 * @param {string} oldPath - 기존 파일 경로
 * @param {string} newPath - 새로운 파일 경로
 * @returns {boolean} 이동 성공 시 true, 실패 시 false
 * @example
 * ```typescript
 * moveFile('/temp/old.txt', '/archive/new.txt'); // true (이동 성공)
 *
 * // 파일명만 변경
 * moveFile('/logs/app.log', '/logs/app-backup.log'); // true
 * ```
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
 * @param {string} sourcePath - 원본 파일 경로
 * @param {string} destPath - 대상 파일 경로
 * @returns {boolean} 복사 성공 시 true, 실패 시 false
 * @example
 * ```typescript
 * copyFile('/logs/app.log', '/backup/app.log'); // true (복사 성공)
 * ```
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
 * 파일을 gzip으로 압축합니다.
 * @param {string} filePath - 압축할 파일 경로
 * @param {CompressFileOptions} [options={}] - 압축 옵션
 * @returns {Promise<boolean>} 압축 성공 시 true를 resolve하는 Promise
 * @example
 * ```typescript
 * await compressFile('/logs/app.log'); // true (app.log.gz 파일 생성됨)
 *
 * // 원본 파일 삭제하면서 압축
 * await compressFile('/logs/old.log', { deleteOriginal: true });
 * ```
 */
export async function compressFile(filePath: string, options: CompressFileOptions = {}): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      if (!exists(filePath)) {
        resolve(false);
        return;
      }

      const gzipPath = `${filePath}.gz`;
      const readStream = createReadStream(filePath);
      const writeStream = createWriteStream(gzipPath);
      const gzip = zlib.createGzip({ level: options.level });

      readStream
        .pipe(gzip)
        .pipe(writeStream)
        .on('finish', () => {
          if (options.deleteOriginal) {
            deleteFile(filePath);
          }
          resolve(true);
        })
        .on('error', () => {
          resolve(false);
        });
    } catch {
      resolve(false);
    }
  });
}

/**
 * 여러 파일을 안전하게 삭제합니다.
 * @param {string[]} filePaths - 삭제할 파일 경로 배열
 * @returns {{ success: string[]; failed: string[] }} 성공/실패한 파일 경로 목록
 * @example
 * ```typescript
 * deleteFiles(['/temp/file1.txt', '/temp/file2.txt', '/temp/missing.txt']);
 * // {
 * //   success: ['/temp/file1.txt', '/temp/file2.txt'],
 * //   failed: ['/temp/missing.txt']
 * // }
 * ```
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
 * @param {string} filePath - 정규화할 파일 경로
 * @returns {string} 정규화된 파일 경로
 * @example
 * ```typescript
 * normalizePath('/logs/../temp/./file.txt'); // '/temp/file.txt'
 * ```
 */
export function normalizePath(filePath: string): string {
  return path.normalize(filePath);
}

/**
 * 여러 경로 세그먼트를 결합하여 하나의 경로를 만듭니다.
 * @param {...string} paths - 결합할 경로 세그먼트들
 * @returns {string} 결합된 파일 경로
 * @example
 * ```typescript
 * joinPath('/logs', 'app', 'debug.log'); // '/logs/app/debug.log'
 *
 * joinPath('..', 'config', 'settings.json'); // '../config/settings.json'
 * ```
 */
export function joinPath(...paths: string[]): string {
  return path.join(...paths);
}

/**
 * 파일의 확장자를 가져옵니다.
 * @param {string} filePath - 확장자를 추출할 파일 경로
 * @returns {string} 파일 확장자 (점 포함), 확장자가 없으면 빈 문자열
 * @example
 * ```typescript
 * getExtension('/logs/app.log'); // '.log'
 *
 * getExtension('/config/settings'); // ''
 * ```
 */
export function getExtension(filePath: string): string {
  return path.extname(filePath);
}

/**
 * 파일명을 확장자 없이 가져옵니다.
 * @param {string} filePath - 파일명을 추출할 파일 경로
 * @returns {string} 확장자를 제외한 파일명
 * @example
 * ```typescript
 * getBaseName('/logs/app.log'); // 'app'
 *
 * getBaseName('/config/settings.json'); // 'settings'
 * ```
 */
export function getBaseName(filePath: string): string {
  return path.basename(filePath, getExtension(filePath));
}

/**
 * 파일의 디렉토리 경로를 가져옵니다.
 * @param {string} filePath - 디렉토리를 추출할 파일 경로
 * @returns {string} 파일이 위치한 디렉토리 경로
 * @example
 * ```typescript
 * getDirectory('/logs/app/debug.log'); // '/logs/app'
 *
 * getDirectory('config.json'); // '.'
 * ```
 */
export function getDirectory(filePath: string): string {
  return path.dirname(filePath);
}
