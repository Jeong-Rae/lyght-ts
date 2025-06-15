import type { LogLevel, Meta } from '../types';
import { toISOString } from '../utils/datetime';
import type { LogFormatter } from './log-formatter';

/**
 * 기본 포맷터 - ISO 타임스탬프 + [LEVEL] + 메시지 + JSON 메타
 *
 * 가장 표준적인 로그 형식을 제공하며, 대부분의 로깅 시나리오에 적합합니다.
 * 타임스탬프는 ISO 8601 형식을 사용하고, 로그 레벨은 대괄호로 감싸서 표시합니다.
 */
export class DefaultFormatter implements LogFormatter {
  /**
   * 로그를 기본 형식으로 포맷팅합니다.
   * @param {LogLevel} level - 로그 레벨
   * @param {string} message - 로그 메시지
   * @param {Meta} meta - 메타데이터 객체
   * @param {Date} timestamp - 로그 생성 시간
   * @returns {string} 포맷팅된 로그 문자열
   * @example
   * ```typescript
   * const formatter = new DefaultFormatter();
   * formatter.format('info', 'User logged in', { userId: '123' }, new Date());
   * // "2024-01-01T12:30:45.123Z [INFO] User logged in {"userId":"123"}\n"
   * ```
   */
  format(level: LogLevel, message: string, meta: Meta, timestamp: Date): string {
    const formattedTimestamp = toISOString(timestamp);
    const formattedLevel = `[${level.toUpperCase()}]`;
    const formattedMeta = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${formattedTimestamp} ${formattedLevel} ${message}${formattedMeta}\n`;
  }
}
