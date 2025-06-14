import { LogLevel } from "../types";
import { LOG_LEVEL_PRIORITY } from "../constants";

/**
 * 첫 번째 로그 레벨이 두 번째 로그 레벨보다 높거나 같은지 확인합니다.
 * @param {LogLevel} level - 확인할 로그 레벨
 * @param {LogLevel} threshold - 기준 로그 레벨
 * @returns {boolean} level이 threshold보다 높거나 같으면 true
 * 
 * @example
 * ```typescript
 * isLogLevelEnabled('info', 'debug'); // true
 * isLogLevelEnabled('warn', 'error'); // false
 * ```
 */
export function isLogLevelEnabled(
	level: LogLevel,
	threshold: LogLevel,
): boolean {
	return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[threshold];
}

/**
 * 로그 레벨의 우선순위 값을 반환합니다.
 * @param {LogLevel} level - 로그 레벨
 * @returns {number} 우선순위 값
 * 
 * @example
 * ```typescript
 * getLogLevelPriority('info'); // 2
 * getLogLevelPriority('error'); // 4
 * ```
 */
export function getLogLevelPriority(level: LogLevel): number {
	return LOG_LEVEL_PRIORITY[level];
}

/**
 * 로그 레벨이 유효한지 확인합니다.
 * @param {string} level - 확인할 로그 레벨
 * @returns {boolean} 유효한 로그 레벨이면 true
 * 
 * @example
 * ```typescript
 * isValidLogLevel('info'); // true
 * isValidLogLevel('invalid'); // false
 * ```
 */
export function isValidLogLevel(level: string): level is LogLevel {
	return level in LOG_LEVEL_PRIORITY;
}
