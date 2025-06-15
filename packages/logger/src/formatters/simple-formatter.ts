import { LOG_LEVEL_PADDING } from '../constants';
import type { LogLevel, Meta } from '../types';
import { toTimeString } from '../utils/datetime';
import type { LogFormatter } from './log-formatter';

/**
 * 심플 포맷터 - HH:MM:SS + 레벨 + 메시지
 *
 * 간단하고 읽기 쉬운 형식의 로그를 제공합니다.
 * 개발 환경이나 콘솔 출력에 적합하며, 시간은 HH:MM:SS 형식으로 표시됩니다.
 * 로그 레벨은 일정한 길이로 패딩되어 정렬된 출력을 제공합니다.
 */
export class SimpleFormatter implements LogFormatter {
  /**
   * 로그를 간단한 형식으로 포맷팅합니다.
   * @param {LogLevel} level - 로그 레벨
   * @param {string} message - 로그 메시지
   * @param {Meta} meta - 메타데이터 객체
   * @param {Date} timestamp - 로그 생성 시간
   * @returns {string} 간단한 형식의 로그 문자열
   * @example
   * ```typescript
   * const formatter = new SimpleFormatter();
   * formatter.format('error', 'Database connection failed', { db: 'users' }, new Date());
   * // "12:30:45 error Database connection failed | {"db":"users"}\n"
   * ```
   */
  format(level: LogLevel, message: string, meta: Meta, timestamp: Date): string {
    const formattedTime = toTimeString(timestamp);
    const formattedLevel = level.padEnd(LOG_LEVEL_PADDING);
    const formattedMeta = Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : '';
    return `${formattedTime} ${formattedLevel} ${message}${formattedMeta}\n`;
  }
}
