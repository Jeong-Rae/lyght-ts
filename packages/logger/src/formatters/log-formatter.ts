import { LogLevel, Meta } from "../types";

/**
 * 로그 포맷터 인터페이스
 * 모든 로그 포맷터가 구현해야 하는 기본 계약을 정의합니다.
 */
export interface LogFormatter {
	/**
	 * 로그 메시지를 지정된 형식으로 포맷팅합니다.
	 * @param {LogLevel} level - 로그 레벨 (debug, info, warn, error)
	 * @param {string} message - 로그 메시지
	 * @param {Meta} meta - 추가 메타데이터 객체
	 * @param {Date} timestamp - 로그 생성 시간
	 * @returns {string} 포맷팅된 로그 문자열 (개행 문자 포함)
	 */
	format(level: LogLevel, message: string, meta: Meta, timestamp: Date): string;
}
