import path from 'node:path';
import { DATE_FORMAT_REGEX, DEFAULT_MAX_DAYS, FILE_APPEND_FLAG, LOG_FILE_EXTENSION } from '../constants';
import { DefaultFormatter, type LogFormatter } from '../formatters';
import type { LogLevel, Meta, Transport } from '../types';
import { extractDateFromFilename, isOlderThan, now, toDateString } from '../utils/datetime';
import { createWriteStream, deleteFile, ensureDirectory, joinPath, listFilesWithPattern } from '../utils/fs';

/**
 * @deprecated DailyFileTransport는 더 이상 사용되지 않습니다.
 * 대신 FileTransport의 rotation: 'date' 옵션을 사용하세요.
 *
 * @example
 * ```typescript
 * // 기존 방식 (deprecated)
 * new DailyFileTransport({ logDirectory: './logs' })
 *
 * // 새로운 방식 (권장)
 * new FileTransport({
 *   filePath: './logs',
 *   rotation: 'date'
 * })
 * ```
 */
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
 * @deprecated DailyFileTransport는 더 이상 사용되지 않습니다.
 * 대신 FileTransport의 rotation: 'date' 옵션을 사용하세요.
 *
 * 날짜별로 로그 파일을 생성하는 Transport
 *
 * @example
 * ```typescript
 * // 기존 방식 (deprecated)
 * new DailyFileTransport({
 *   logDirectory: './logs',
 *   fileNamePattern: 'app',
 *   maxDays: 30
 * })
 *
 * // 새로운 방식 (권장)
 * new FileTransport({
 *   filePath: './logs',
 *   fileNamePattern: 'app',
 *   rotation: 'date',
 *   cleanup: { maxDays: 30 }
 * })
 * ```
 */
export class DailyFileTransport implements Transport {
  private readonly logDirectory: string;
  private readonly fileNamePattern: string;
  private readonly maxDays: number;
  private readonly formatter: LogFormatter;
  private currentDate = '';
  private currentStream?: NodeJS.WritableStream;
  private isClosed = false;

  constructor(options: DailyFileTransportOptions) {
    // Deprecation warning
    console.warn(
      '⚠️  DailyFileTransport is deprecated. Use FileTransport with rotation: "date" instead.\n' +
        '   Example: new FileTransport({ filePath: "./logs", rotation: "date" })',
    );

    this.logDirectory = options.logDirectory;
    this.fileNamePattern = options.fileNamePattern ?? 'app';
    this.maxDays = options.maxDays ?? DEFAULT_MAX_DAYS;
    this.formatter = options.formatter ?? new DefaultFormatter();

    // 디렉토리 생성
    ensureDirectory(this.logDirectory);

    // 초기 정리 작업
    this.cleanupOldFiles();
  }

  private formatDate(date: Date): string {
    return toDateString(date);
  }

  private getCurrentFilePath(date: Date): string {
    const formattedDate = this.formatDate(date);
    return path.join(this.logDirectory, `${this.fileNamePattern}-${formattedDate}${LOG_FILE_EXTENSION}`);
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
      try {
        this.currentStream = createWriteStream(filePath, {
          flags: FILE_APPEND_FLAG,
        });
      } catch {
        // 스트림 생성 실패 시 무시
        this.currentStream = undefined;
      }
    }
  }

  private cleanupOldFiles(): void {
    try {
      const pattern = new RegExp(`^${this.fileNamePattern}-.*${LOG_FILE_EXTENSION}$`);
      const files = listFilesWithPattern(this.logDirectory, pattern);
      const currentDate = now();

      for (const file of files) {
        const match = file.match(DATE_FORMAT_REGEX);
        if (match) {
          const fileDate = extractDateFromFilename(file);
          if (fileDate && isOlderThan(fileDate, this.maxDays, currentDate)) {
            const filePath = joinPath(this.logDirectory, file);
            deleteFile(filePath);
          }
        }
      }
    } catch {
      // 실패는 무시
    }
  }

  /**
   * 수동 정리
   */
  manualCleanup(): void {
    this.cleanupOldFiles();
  }

  log(level: LogLevel, message: string, meta: Meta = {}, timestamp: Date = now()): void {
    if (this.isClosed) {
      return;
    }

    this.ensureCurrentStream(timestamp);

    if (this.currentStream) {
      const formattedEntry = this.formatter.format(level, message, meta, timestamp);
      try {
        this.currentStream.write(formattedEntry);
      } catch {
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
