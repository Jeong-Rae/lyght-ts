import { describe, it, expect } from "vitest";
import {
	DefaultFormatter,
	JsonFormatter,
	SimpleFormatter,
	CustomFormatter,
} from "./index";

describe("Formatters", () => {
	const testDate = new Date("2024-01-01T12:30:45.123Z");
	const testMeta = { userId: "123", action: "login" };

	describe("DefaultFormatter", () => {
		const formatter = new DefaultFormatter();

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

			expect(result).toBe(
				"2024-01-01T12:30:45.123Z [ERROR] error message {}\n",
			);
		});

		it("모든 로그 레벨을 올바르게 포맷팅합니다", () => {
			const levels = ["debug", "info", "warn", "error"] as const;

			levels.forEach((level) => {
				const result = formatter.format(level, "test", {}, testDate);
				expect(result).toContain(`[${level.toUpperCase()}]`);
			});
		});
	});

	describe("JsonFormatter", () => {
		const formatter = new JsonFormatter();

		it("JSON 포맷으로 로그를 포맷팅합니다", () => {
			const result = formatter.format(
				"warn",
				"warning message",
				testMeta,
				testDate,
			);
			const parsed = JSON.parse(result.trim());

			expect(parsed).toEqual({
				timestamp: "2024-01-01T12:30:45.123Z",
				level: "WARN",
				message: "warning message",
				userId: "123",
				action: "login",
			});
		});

		it("메타데이터가 없을 때 JSON 포맷으로 로그를 포맷팅합니다", () => {
			const result = formatter.format("debug", "debug message", {}, testDate);
			const parsed = JSON.parse(result.trim());

			expect(parsed).toEqual({
				timestamp: "2024-01-01T12:30:45.123Z",
				level: "DEBUG",
				message: "debug message",
			});
		});

		it("복잡한 메타데이터를 올바르게 직렬화합니다", () => {
			const complexMeta = {
				user: { id: 123, name: "John" },
				tags: ["auth", "login"],
				nested: { deep: { value: true } },
			};

			const result = formatter.format(
				"info",
				"complex data",
				complexMeta,
				testDate,
			);
			const parsed = JSON.parse(result.trim());

			expect(parsed.user).toEqual({ id: 123, name: "John" });
			expect(parsed.tags).toEqual(["auth", "login"]);
			expect(parsed.nested.deep.value).toBe(true);
		});
	});

	describe("SimpleFormatter", () => {
		const formatter = new SimpleFormatter();

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

	describe("CustomFormatter", () => {
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
});
