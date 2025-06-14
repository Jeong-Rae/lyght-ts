import { describe, it, expect } from "vitest";
import { SimpleFormatter } from "./simple-formatter";

describe("SimpleFormatter", () => {
	const formatter = new SimpleFormatter();
	const testDate = new Date("2024-01-01T12:30:45.123Z");
	const testMeta = { userId: "123", action: "login" };

	it("심플 포맷으로 로그를 포맷팅합니다", () => {
		const result = formatter.format(
			"info",
			"simple message",
			testMeta,
			testDate,
		);

		expect(result).toBe(
			'12:30:45 info  simple message | {"userId":"123","action":"login"}\n',
		);
	});

	it("메타데이터가 없을 때 심플 포맷으로 로그를 포맷팅합니다", () => {
		const result = formatter.format("error", "error message", {}, testDate);

		expect(result).toBe("12:30:45 error error message\n");
	});

	it("로그 레벨을 올바른 길이로 패딩합니다", () => {
		const result = formatter.format("warn", "test", {}, testDate);

		// "warn "은 5자리로 패딩되어야 함
		expect(result).toContain("warn ");
		expect(result.indexOf("warn ")).toBe(9); // 시간 이후 위치
	});
});
