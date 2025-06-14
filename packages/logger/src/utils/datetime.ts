/**
 * 날짜/시간 관련 유틸리티 함수들
 */

/**
 * Date 객체를 ISO 8601 형식 문자열로 변환합니다.
 * @param date - 변환할 Date 객체 (기본값: 현재 시간)
 * @returns ISO 8601 형식 문자열 (예: "2024-01-15T12:30:45.123Z")
 */
export function toISOString(date: Date = new Date()): string {
	if (isNaN(date.getTime())) {
		return "Invalid Date";
	}
	return date.toISOString();
}

/**
 * Date 객체를 HH:MM:SS 형식 문자열로 변환합니다.
 * @param date - 변환할 Date 객체 (기본값: 현재 시간)
 * @returns HH:MM:SS 형식 문자열 (예: "12:30:45")
 */
export function toTimeString(date: Date = new Date()): string {
	return date.toISOString().split("T")[1].split(".")[0]; // UTC 시간 기준
}

/**
 * Date 객체를 YYYY-MM-DD 형식 문자열로 변환합니다.
 * @param date - 변환할 Date 객체 (기본값: 현재 시간)
 * @returns YYYY-MM-DD 형식 문자열 (예: "2024-01-15")
 */
export function toDateString(date: Date = new Date()): string {
	return date.toISOString().split("T")[0];
}

/**
 * Date 객체를 YYYY-MM-DD HH:MM:SS 형식 문자열로 변환합니다.
 * @param date - 변환할 Date 객체 (기본값: 현재 시간)
 * @returns YYYY-MM-DD HH:MM:SS 형식 문자열 (예: "2024-01-15 12:30:45")
 */
export function toDateTimeString(date: Date = new Date()): string {
	if (isNaN(date.getTime())) {
		return "Invalid Date";
	}
	const isoString = date.toISOString();
	return isoString.replace("T", " ").split(".")[0];
}

/**
 * Date 객체를 로컬 시간대의 HH:MM:SS 형식 문자열로 변환합니다.
 * @param date - 변환할 Date 객체 (기본값: 현재 시간)
 * @returns 로컬 HH:MM:SS 형식 문자열 (예: "12:30:45")
 */
export function toLocalTimeString(date: Date = new Date()): string {
	return date.toLocaleTimeString("en-GB", {
		hour12: false,
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

/**
 * Date 객체를 로컬 시간대의 YYYY-MM-DD 형식 문자열로 변환합니다.
 * @param date - 변환할 Date 객체 (기본값: 현재 시간)
 * @returns 로컬 YYYY-MM-DD 형식 문자열 (예: "2024-01-15")
 */
export function toLocalDateString(date: Date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Date 객체를 로컬 시간대의 YYYY-MM-DD HH:MM:SS 형식 문자열로 변환합니다.
 * @param date - 변환할 Date 객체 (기본값: 현재 시간)
 * @returns 로컬 YYYY-MM-DD HH:MM:SS 형식 문자열 (예: "2024-01-15 12:30:45")
 */
export function toLocalDateTimeString(date: Date = new Date()): string {
	return `${toLocalDateString(date)} ${toLocalTimeString(date)}`;
}

/**
 * 현재 시간을 반환합니다.
 * @returns 현재 시간의 Date 객체
 */
export function now(): Date {
	return new Date();
}

/**
 * 현재 시간을 ISO 8601 형식으로 반환합니다.
 * @returns 현재 시간의 ISO 8601 문자열
 */
export function nowISO(): string {
	return toISOString();
}

/**
 * 현재 시간을 HH:MM:SS 형식으로 반환합니다.
 * @returns 현재 시간의 HH:MM:SS 문자열
 */
export function nowTime(): string {
	return toTimeString();
}

/**
 * 현재 날짜를 YYYY-MM-DD 형식으로 반환합니다.
 * @returns 현재 날짜의 YYYY-MM-DD 문자열
 */
export function nowDate(): string {
	return toDateString();
}

/**
 * 두 날짜가 같은 날인지 확인합니다.
 * @param date1 - 첫 번째 날짜
 * @param date2 - 두 번째 날짜
 * @returns 같은 날이면 true, 아니면 false
 */
export function isSameDay(date1: Date, date2: Date): boolean {
	return toDateString(date1) === toDateString(date2);
}

/**
 * 날짜에서 지정된 일수를 더합니다.
 * @param date - 기준 날짜
 * @param days - 더할 일수 (음수 가능)
 * @returns 새로운 Date 객체
 */
export function addDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

/**
 * 날짜에서 지정된 시간을 더합니다.
 * @param date - 기준 날짜
 * @param hours - 더할 시간 (음수 가능)
 * @returns 새로운 Date 객체
 */
export function addHours(date: Date, hours: number): Date {
	const result = new Date(date);
	result.setHours(result.getHours() + hours);
	return result;
}

/**
 * 날짜에서 지정된 분을 더합니다.
 * @param date - 기준 날짜
 * @param minutes - 더할 분 (음수 가능)
 * @returns 새로운 Date 객체
 */
export function addMinutes(date: Date, minutes: number): Date {
	const result = new Date(date);
	result.setMinutes(result.getMinutes() + minutes);
	return result;
}

/**
 * 두 날짜 사이의 일수 차이를 계산합니다.
 * @param date1 - 첫 번째 날짜
 * @param date2 - 두 번째 날짜
 * @returns 일수 차이 (date2 - date1)
 */
export function daysDifference(date1: Date, date2: Date): number {
	const timeDiff = date2.getTime() - date1.getTime();
	return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
}

/**
 * 날짜가 지정된 일수보다 오래되었는지 확인합니다.
 * @param date - 확인할 날짜
 * @param days - 기준 일수
 * @param referenceDate - 기준 날짜 (기본값: 현재 시간)
 * @returns 오래되었으면 true, 아니면 false
 */
export function isOlderThan(
	date: Date,
	days: number,
	referenceDate: Date = new Date(),
): boolean {
	return daysDifference(date, referenceDate) > days;
}

/**
 * 파일명에서 날짜를 추출합니다.
 * @param filename - 파일명 (예: "app-2024-01-15.log")
 * @param pattern - 날짜 패턴 정규식 (기본값: YYYY-MM-DD 패턴)
 * @returns 추출된 Date 객체 또는 null
 */
export function extractDateFromFilename(
	filename: string,
	pattern: RegExp = /(\d{4}-\d{2}-\d{2})/,
): Date | null {
	const match = filename.match(pattern);
	if (match) {
		const dateStr = match[1];
		const date = new Date(dateStr + "T00:00:00.000Z");
		return isNaN(date.getTime()) ? null : date;
	}
	return null;
}

/**
 * 날짜 문자열을 파싱하여 Date 객체로 변환합니다.
 * @param dateString - 날짜 문자열
 * @returns Date 객체 또는 null (파싱 실패 시)
 */
export function parseDate(dateString: string): Date | null {
	const date = new Date(dateString);
	return isNaN(date.getTime()) ? null : date;
}

/**
 * 날짜를 사용자 친화적인 형식으로 포맷팅합니다.
 * @param date - 포맷팅할 날짜
 * @param format - 포맷 타입
 * @returns 포맷팅된 문자열
 */
export function formatDate(
	date: Date,
	format:
		| "iso"
		| "date"
		| "time"
		| "datetime"
		| "local-time"
		| "local-date"
		| "local-datetime" = "iso",
): string {
	switch (format) {
		case "iso":
			return toISOString(date);
		case "date":
			return toDateString(date);
		case "time":
			return toTimeString(date);
		case "datetime":
			return toDateTimeString(date);
		case "local-time":
			return toLocalTimeString(date);
		case "local-date":
			return toLocalDateString(date);
		case "local-datetime":
			return toLocalDateTimeString(date);
		default:
			return toISOString(date);
	}
}

/**
 * 타임스탬프를 생성합니다.
 * @param date - 기준 날짜 (기본값: 현재 시간)
 * @returns Unix 타임스탬프 (밀리초)
 */
export function timestamp(date: Date = new Date()): number {
	return date.getTime();
}

/**
 * Unix 타임스탬프를 Date 객체로 변환합니다.
 * @param ts - Unix 타임스탬프 (밀리초)
 * @returns Date 객체
 */
export function fromTimestamp(ts: number): Date {
	return new Date(ts);
}
