import { LogLevel, Meta } from "../types";
import { toISOString } from "../utils/datetime";
import { LogFormatter } from "./log-formatter";

/**
 * JSON 포맷터 - 완전한 JSON 객체 형태
 * 
 * 로그를 구조화된 JSON 형식으로 출력합니다.
 * 로그 분석 도구나 구조화된 로깅이 필요한 환경에서 유용합니다.
 * 메타데이터는 JSON 객체의 최상위 레벨에 병합됩니다.
 */
export class JsonFormatter implements LogFormatter {
	/**
	 * 로그를 JSON 형식으로 포맷팅합니다.
	 * @param {LogLevel} level - 로그 레벨
	 * @param {string} message - 로그 메시지
	 * @param {Meta} meta - 메타데이터 객체
	 * @param {Date} timestamp - 로그 생성 시간
	 * @returns {string} JSON 형식의 로그 문자열
	 * @example
	 * ```typescript
	 * const formatter = new JsonFormatter();
	 * formatter.format('warn', 'High memory usage', { memory: '85%' }, new Date());
	 * // {"timestamp":"2024-01-01T12:30:45.123Z","level":"WARN","message":"High memory usage","memory":"85%"}\n
	 * ```
	 */
	format(
		level: LogLevel,
		message: string,
		meta: Meta,
		timestamp: Date,
	): string {
		const logEntry = {
			timestamp: toISOString(timestamp),
			level: level.toUpperCase(),
			message,
			...meta,
		};
		return JSON.stringify(logEntry) + "\n";
	}
} 