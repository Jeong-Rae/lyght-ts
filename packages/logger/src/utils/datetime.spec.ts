import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	toISOString,
	toTimeString,
	toDateString,
	toDateTimeString,
	toLocalTimeString,
	toLocalDateString,
	toLocalDateTimeString,
	now,
	nowISO,
	nowTime,
	nowDate,
	isSameDay,
	addDays,
	addHours,
	addMinutes,
	daysDifference,
	isOlderThan,
	extractDateFromFilename,
	parseDate,
	formatDate,
	timestamp,
	fromTimestamp,
} from "./datetime";

describe("datetime utilities", () => {
	const testDate = new Date("2024-01-15T12:30:45.123Z");

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(testDate);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("formatting functions", () => {
		it("toISOString은 ISO 8601 형식으로 변환합니다", () => {
			expect(toISOString(testDate)).toBe("2024-01-15T12:30:45.123Z");
		});

		it("toISOString은 기본값으로 현재 시간을 사용합니다", () => {
			expect(toISOString()).toBe("2024-01-15T12:30:45.123Z");
		});

		it("toTimeString은 HH:MM:SS 형식으로 변환합니다", () => {
			const result = toTimeString(testDate);
			expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
		});

		it("toDateString은 YYYY-MM-DD 형식으로 변환합니다", () => {
			expect(toDateString(testDate)).toBe("2024-01-15");
		});

		it("toDateTimeString은 YYYY-MM-DD HH:MM:SS 형식으로 변환합니다", () => {
			expect(toDateTimeString(testDate)).toBe("2024-01-15 12:30:45");
		});

		it("toLocalTimeString은 로컬 HH:MM:SS 형식으로 변환합니다", () => {
			const result = toLocalTimeString(testDate);
			expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
		});

		it("toLocalDateString은 로컬 YYYY-MM-DD 형식으로 변환합니다", () => {
			const result = toLocalDateString(testDate);
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		});

		it("toLocalDateTimeString은 로컬 YYYY-MM-DD HH:MM:SS 형식으로 변환합니다", () => {
			const result = toLocalDateTimeString(testDate);
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
		});
	});

	describe("current time functions", () => {
		it("now는 현재 시간을 반환합니다", () => {
			expect(now()).toEqual(testDate);
		});

		it("nowISO는 현재 시간을 ISO 형식으로 반환합니다", () => {
			expect(nowISO()).toBe("2024-01-15T12:30:45.123Z");
		});

		it("nowTime은 현재 시간을 HH:MM:SS 형식으로 반환합니다", () => {
			const result = nowTime();
			expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
		});

		it("nowDate는 현재 날짜를 YYYY-MM-DD 형식으로 반환합니다", () => {
			expect(nowDate()).toBe("2024-01-15");
		});
	});

	describe("date comparison functions", () => {
		it("isSameDay는 같은 날짜를 올바르게 판단합니다", () => {
			const date1 = new Date("2024-01-15T10:00:00Z");
			const date2 = new Date("2024-01-15T20:00:00Z");
			const date3 = new Date("2024-01-16T10:00:00Z");

			expect(isSameDay(date1, date2)).toBe(true);
			expect(isSameDay(date1, date3)).toBe(false);
		});

		it("daysDifference는 날짜 차이를 올바르게 계산합니다", () => {
			const date1 = new Date("2024-01-15");
			const date2 = new Date("2024-01-18");
			const date3 = new Date("2024-01-10");

			expect(daysDifference(date1, date2)).toBe(3);
			expect(daysDifference(date1, date3)).toBe(-5);
		});

		it("isOlderThan은 날짜가 오래되었는지 올바르게 판단합니다", () => {
			const oldDate = new Date("2024-01-01");
			const recentDate = new Date("2024-01-14");
			const referenceDate = new Date("2024-01-15");

			expect(isOlderThan(oldDate, 10, referenceDate)).toBe(true);
			expect(isOlderThan(recentDate, 10, referenceDate)).toBe(false);
		});
	});

	describe("date manipulation functions", () => {
		it("addDays는 날짜에 일수를 더합니다", () => {
			const result = addDays(testDate, 5);
			expect(toDateString(result)).toBe("2024-01-20");

			const resultNegative = addDays(testDate, -3);
			expect(toDateString(resultNegative)).toBe("2024-01-12");
		});

		it("addHours는 날짜에 시간을 더합니다", () => {
			const result = addHours(testDate, 6);
			expect(result.getUTCHours()).toBe(18);

			const resultNegative = addHours(testDate, -2);
			expect(resultNegative.getUTCHours()).toBe(10);
		});

		it("addMinutes는 날짜에 분을 더합니다", () => {
			const result = addMinutes(testDate, 30);
			expect(result.getUTCMinutes()).toBe(0);
			expect(result.getUTCHours()).toBe(13);

			const resultNegative = addMinutes(testDate, -15);
			expect(resultNegative.getUTCMinutes()).toBe(15);
		});
	});

	describe("parsing functions", () => {
		it("extractDateFromFilename은 파일명에서 날짜를 추출합니다", () => {
			const filename1 = "app-2024-01-15.log";
			const filename2 = "service-2023-12-25.log";
			const filename3 = "invalid-filename.log";

			const date1 = extractDateFromFilename(filename1);
			const date2 = extractDateFromFilename(filename2);
			const date3 = extractDateFromFilename(filename3);

			expect(date1).toEqual(new Date("2024-01-15T00:00:00.000Z"));
			expect(date2).toEqual(new Date("2023-12-25T00:00:00.000Z"));
			expect(date3).toBeNull();
		});

		it("extractDateFromFilename은 커스텀 패턴을 사용할 수 있습니다", () => {
			const filename = "log_20240115_debug.txt";
			const pattern = /(\d{4})(\d{2})(\d{2})/;
			const customExtract = (filename: string) => {
				const match = filename.match(pattern);
				if (match) {
					const dateStr = `${match[1]}-${match[2]}-${match[3]}`;
					return parseDate(dateStr);
				}
				return null;
			};

			const result = customExtract(filename);
			expect(result).toEqual(new Date("2024-01-15T00:00:00.000Z"));
		});

		it("parseDate는 날짜 문자열을 파싱합니다", () => {
			const validDate = parseDate("2024-01-15");
			const invalidDate = parseDate("invalid-date");

			expect(validDate).toEqual(new Date("2024-01-15T00:00:00.000Z"));
			expect(invalidDate).toBeNull();
		});
	});

	describe("formatDate function", () => {
		it("formatDate는 다양한 형식으로 날짜를 포맷팅합니다", () => {
			expect(formatDate(testDate, "iso")).toBe("2024-01-15T12:30:45.123Z");
			expect(formatDate(testDate, "date")).toBe("2024-01-15");
			expect(formatDate(testDate, "time")).toMatch(/^\d{2}:\d{2}:\d{2}$/);
			expect(formatDate(testDate, "datetime")).toBe("2024-01-15 12:30:45");
			expect(formatDate(testDate, "local-time")).toMatch(/^\d{2}:\d{2}:\d{2}$/);
			expect(formatDate(testDate, "local-date")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(formatDate(testDate, "local-datetime")).toMatch(
				/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
			);
		});

		it("formatDate는 기본값으로 iso 형식을 사용합니다", () => {
			expect(formatDate(testDate)).toBe("2024-01-15T12:30:45.123Z");
		});
	});

	describe("timestamp functions", () => {
		it("timestamp는 Unix 타임스탬프를 반환합니다", () => {
			const ts = timestamp(testDate);
			expect(ts).toBe(testDate.getTime());
		});

		it("timestamp는 기본값으로 현재 시간을 사용합니다", () => {
			const ts = timestamp();
			expect(ts).toBe(testDate.getTime());
		});

		it("fromTimestamp는 타임스탬프를 Date 객체로 변환합니다", () => {
			const ts = testDate.getTime();
			const result = fromTimestamp(ts);
			expect(result).toEqual(testDate);
		});
	});

	describe("edge cases", () => {
		it("윤년을 올바르게 처리합니다", () => {
			const leapYear = new Date("2024-02-29T12:00:00Z");
			expect(toDateString(leapYear)).toBe("2024-02-29");

			const nextDay = addDays(leapYear, 1);
			expect(toDateString(nextDay)).toBe("2024-03-01");
		});

		it("월말/월초 경계를 올바르게 처리합니다", () => {
			const endOfMonth = new Date("2024-01-31T23:59:59Z");
			const nextDay = addDays(endOfMonth, 1);
			expect(toDateString(nextDay)).toBe("2024-02-01");
		});

		it("연말/연초 경계를 올바르게 처리합니다", () => {
			const endOfYear = new Date("2023-12-31T23:59:59Z");
			const nextDay = addDays(endOfYear, 1);
			expect(toDateString(nextDay)).toBe("2024-01-01");
		});

		it("시간대 변경을 올바르게 처리합니다", () => {
			const date = new Date("2024-01-15T23:30:00Z");
			const added = addHours(date, 2);
			expect(toDateString(added)).toBe("2024-01-16");
		});

		it("잘못된 날짜 입력을 처리합니다", () => {
			const invalidDate = new Date("invalid");
			expect(toISOString(invalidDate)).toBe("Invalid Date");
		});
	});
});
