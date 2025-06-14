import { LogLevel, Meta } from "../types";
import { LogFormatter } from "./log-formatter";

/**
 * 커스텀 포맷터 - 사용자 정의 포맷 함수 사용
 * 
 * 사용자가 정의한 포맷 함수를 사용하여 로그를 포맷팅합니다.
 * 특별한 요구사항이나 기존 포맷터로는 충족할 수 없는 형식이 필요할 때 사용합니다.
 * 완전한 커스터마이징이 가능하며, 복잡한 로그 형식도 구현할 수 있습니다.
 */
export class CustomFormatter implements LogFormatter {
	/**
	 * CustomFormatter 인스턴스를 생성합니다.
	 * @param {function} formatFn - 로그 포맷팅을 수행할 사용자 정의 함수
	 * @param {LogLevel} formatFn.level - 로그 레벨
	 * @param {string} formatFn.message - 로그 메시지
	 * @param {Meta} formatFn.meta - 메타데이터 객체
	 * @param {Date} formatFn.timestamp - 로그 생성 시간
	 * @returns {string} formatFn이 반환하는 포맷팅된 문자열
	 * @example
	 * ```typescript
	 * const customFn = (level, message, meta, timestamp) => {
	 *   return `[${timestamp.getTime()}] ${level.toUpperCase()}: ${message}\n`;
	 * };
	 * const formatter = new CustomFormatter(customFn);
	 * ```
	 */
	constructor(
		private formatFn: (
			level: LogLevel,
			message: string,
			meta: Meta,
			timestamp: Date,
		) => string,
	) {}

	/**
	 * 사용자 정의 함수를 사용하여 로그를 포맷팅합니다.
	 * @param {LogLevel} level - 로그 레벨
	 * @param {string} message - 로그 메시지
	 * @param {Meta} meta - 메타데이터 객체
	 * @param {Date} timestamp - 로그 생성 시간
	 * @returns {string} 사용자 정의 함수가 반환하는 포맷팅된 로그 문자열
	 * @example
	 * ```typescript
	 * const customFn = (level, message, meta) => {
	 *   const metaStr = Object.keys(meta).length > 0 ? ` [${JSON.stringify(meta)}]` : '';
	 *   return `${level.toUpperCase()}: ${message}${metaStr}\n`;
	 * };
	 * const formatter = new CustomFormatter(customFn);
	 * const result = formatter.format('info', 'Custom log', { id: 1 }, new Date());
	 * result // "INFO: Custom log [{"id":1}]\n"
	 * ```
	 */
	format(
		level: LogLevel,
		message: string,
		meta: Meta,
		timestamp: Date,
	): string {
		return this.formatFn(level, message, meta, timestamp);
	}
} 