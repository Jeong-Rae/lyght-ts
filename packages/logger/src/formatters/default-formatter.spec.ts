import { describe, it, expect } from "vitest";
import { DefaultFormatter } from "./default-formatter";

describe("DefaultFormatter", () => {
	const formatter = new DefaultFormatter();
	const testDate = new Date("2024-01-01T12:30:45.123Z");
	const testMeta = { userId: "123", action: "login" };

	it("기본 포맷으로 로그를 포맷팅합니다", () => {
		const result = formatter.format(
			"info",
			"test message",
			testMeta,
			testDate,
		);

		expect(result).toBe(
			'2024-01-01T12:30:45.123Z [INFO] test message {"userId":"123","action":"login"}\n',
		);
	});

	it("빈 메타데이터로 로그를 포맷팅합니다", () => {
		const result = formatter.format("error", "error message", {}, testDate);

		expect(result).toBe("2024-01-01T12:30:45.123Z [ERROR] error message\n");
	});

	it("모든 로그 레벨을 올바르게 포맷팅합니다", () => {
		const levels = ["debug", "info", "warn", "error"] as const;

		levels.forEach((level) => {
			const result = formatter.format(level, "test", {}, testDate);
			expect(result).toContain(`[${level.toUpperCase()}]`);
		});
	});
}); 