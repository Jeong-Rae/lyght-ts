import { describe, it, expect } from "vitest";
import { CustomFormatter } from "./custom-formatter";

describe("CustomFormatter", () => {
	const testDate = new Date("2024-01-01T12:30:45.123Z");
	const testMeta = { userId: "123", action: "login" };

	it("커스텀 포맷 함수를 사용합니다", () => {
		const customFn = (
			level: string,
			message: string,
			meta: any,
			timestamp: Date,
		) => {
			return `CUSTOM: ${level} - ${message} @ ${timestamp.getTime()}\n`;
		};

		const formatter = new CustomFormatter(customFn);
		const result = formatter.format(
			"info",
			"custom message",
			testMeta,
			testDate,
		);

		expect(result).toBe(
			`CUSTOM: info - custom message @ ${testDate.getTime()}\n`,
		);
	});

	it("메타데이터를 포함한 커스텀 포맷을 사용합니다", () => {
		const customFn = (level: string, message: string, meta: any) => {
			const metaCount = Object.keys(meta).length;
			return `[${level.toUpperCase()}] ${message} (${metaCount} fields)\n`;
		};

		const formatter = new CustomFormatter(customFn);
		const result = formatter.format("debug", "test", testMeta, testDate);

		expect(result).toBe("[DEBUG] test (2 fields)\n");
	});

	it("빈 메타데이터로 커스텀 포맷을 사용합니다", () => {
		const customFn = (level: string, message: string, meta: any) => {
			return `${level}: ${message} [${JSON.stringify(meta)}]\n`;
		};

		const formatter = new CustomFormatter(customFn);
		const result = formatter.format("warn", "warning", {}, testDate);

		expect(result).toBe("warn: warning [{}]\n");
	});
}); 