import { describe, it, expect } from "vitest";
import {
	isLogLevelEnabled,
	getLogLevelPriority,
	isValidLogLevel,
} from "./log-level";

describe("Log Level Utils", () => {
	describe("isLogLevelEnabled", () => {
		it("같은 레벨은 활성화되어야 합니다", () => {
			expect(isLogLevelEnabled("info", "info")).toBe(true);
			expect(isLogLevelEnabled("warn", "warn")).toBe(true);
			expect(isLogLevelEnabled("error", "error")).toBe(true);
			expect(isLogLevelEnabled("debug", "debug")).toBe(true);
		});

		it("높은 우선순위 레벨은 활성화되어야 합니다", () => {
			expect(isLogLevelEnabled("error", "debug")).toBe(true);
			expect(isLogLevelEnabled("warn", "debug")).toBe(true);
			expect(isLogLevelEnabled("info", "debug")).toBe(true);

			expect(isLogLevelEnabled("error", "info")).toBe(true);
			expect(isLogLevelEnabled("warn", "info")).toBe(true);

			expect(isLogLevelEnabled("error", "warn")).toBe(true);
		});

		it("낮은 우선순위 레벨은 비활성화되어야 합니다", () => {
			expect(isLogLevelEnabled("debug", "info")).toBe(false);
			expect(isLogLevelEnabled("debug", "warn")).toBe(false);
			expect(isLogLevelEnabled("debug", "error")).toBe(false);

			expect(isLogLevelEnabled("info", "warn")).toBe(false);
			expect(isLogLevelEnabled("info", "error")).toBe(false);

			expect(isLogLevelEnabled("warn", "error")).toBe(false);
		});
	});

	describe("getLogLevelPriority", () => {
		it("올바른 우선순위 값을 반환해야 합니다", () => {
			expect(getLogLevelPriority("debug")).toBe(10);
			expect(getLogLevelPriority("info")).toBe(20);
			expect(getLogLevelPriority("warn")).toBe(30);
			expect(getLogLevelPriority("error")).toBe(40);
		});

		it("우선순위가 올바른 순서여야 합니다", () => {
			const debugPriority = getLogLevelPriority("debug");
			const infoPriority = getLogLevelPriority("info");
			const warnPriority = getLogLevelPriority("warn");
			const errorPriority = getLogLevelPriority("error");

			expect(debugPriority < infoPriority).toBe(true);
			expect(infoPriority < warnPriority).toBe(true);
			expect(warnPriority < errorPriority).toBe(true);
		});
	});

	describe("isValidLogLevel", () => {
		it("유효한 로그 레벨을 인식해야 합니다", () => {
			expect(isValidLogLevel("debug")).toBe(true);
			expect(isValidLogLevel("info")).toBe(true);
			expect(isValidLogLevel("warn")).toBe(true);
			expect(isValidLogLevel("error")).toBe(true);
		});

		it("유효하지 않은 로그 레벨을 거부해야 합니다", () => {
			expect(isValidLogLevel("invalid")).toBe(false);
			expect(isValidLogLevel("trace")).toBe(false);
			expect(isValidLogLevel("fatal")).toBe(false);
			expect(isValidLogLevel("")).toBe(false);
			expect(isValidLogLevel("DEBUG")).toBe(false); // 대소문자 구분
		});

		it("타입 가드로 작동해야 합니다", () => {
			const testLevel: string = "info";

			if (isValidLogLevel(testLevel)) {
				// 이 블록에서 testLevel은 LogLevel 타입으로 추론되어야 함
				expect(getLogLevelPriority(testLevel)).toBe(20);
			}
		});
	});
});
