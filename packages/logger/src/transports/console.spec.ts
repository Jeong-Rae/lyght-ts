import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConsoleTransport } from "./console";
import { LogLevel } from "../types";

describe("ConsoleTransport", () => {
	let consoleTransport: ConsoleTransport;

	beforeEach(() => {
		consoleTransport = new ConsoleTransport();

		vi.spyOn(console, "debug").mockImplementation(() => {});
		vi.spyOn(console, "info").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("log", () => {
		it("debug 레벨 로그를 console.debug로 출력합니다", () => {
			const mockDate = new Date("2024-01-01T00:00:00.000Z");
			vi.setSystemTime(mockDate);

			const meta = { userId: "123" };
			consoleTransport.log("debug", "debug message", meta, mockDate);

			expect(console.debug).toHaveBeenCalledWith(
				'2024-01-01T00:00:00.000Z [DEBUG] debug message {"userId":"123"}',
			);
		});

		it("info 레벨 로그를 console.info로 출력합니다", () => {
			const mockDate = new Date("2024-01-01T12:30:45.123Z");
			vi.setSystemTime(mockDate);

			const meta = { requestId: "abc123" };
			consoleTransport.log("info", "info message", meta, mockDate);

			expect(console.info).toHaveBeenCalledWith(
				'2024-01-01T12:30:45.123Z [INFO] info message {"requestId":"abc123"}',
			);
		});

		it("warn 레벨 로그를 console.warn으로 출력합니다", () => {
			const mockDate = new Date("2024-01-01T09:15:30.456Z");
			vi.setSystemTime(mockDate);

			consoleTransport.log("warn", "warning message", {}, mockDate);

			expect(console.warn).toHaveBeenCalledWith(
				"2024-01-01T09:15:30.456Z [WARN] warning message",
			);
		});

		it("error 레벨 로그를 console.error로 출력합니다", () => {
			const mockDate = new Date("2024-01-01T18:45:00.789Z");
			vi.setSystemTime(mockDate);

			const meta = { errorCode: "E001", severity: "high" };
			consoleTransport.log("error", "error message", meta, mockDate);

			expect(console.error).toHaveBeenCalledWith(
				'2024-01-01T18:45:00.789Z [ERROR] error message {"errorCode":"E001","severity":"high"}',
			);
		});

		it("meta가 없을 때 빈 객체로 처리합니다", () => {
			const mockDate = new Date("2024-01-01T00:00:00.000Z");
			vi.setSystemTime(mockDate);

			consoleTransport.log("info", "simple message", undefined, mockDate);

			expect(console.info).toHaveBeenCalledWith(
				"2024-01-01T00:00:00.000Z [INFO] simple message",
			);
		});

		it("각 로그 레벨에 대해 올바른 console 메서드를 호출합니다", () => {
			const mockDate = new Date("2024-01-01T00:00:00.000Z");
			vi.setSystemTime(mockDate);

			const testCases: Array<[LogLevel, string]> = [
				["debug", "debug test"],
				["info", "info test"],
				["warn", "warn test"],
				["error", "error test"],
			];

			testCases.forEach(([level, message]) => {
				consoleTransport.log(level, message, {}, mockDate);
			});

			expect(console.debug).toHaveBeenCalledWith(
				"2024-01-01T00:00:00.000Z [DEBUG] debug test",
			);
			expect(console.info).toHaveBeenCalledWith(
				"2024-01-01T00:00:00.000Z [INFO] info test",
			);
			expect(console.warn).toHaveBeenCalledWith(
				"2024-01-01T00:00:00.000Z [WARN] warn test",
			);
			expect(console.error).toHaveBeenCalledWith(
				"2024-01-01T00:00:00.000Z [ERROR] error test",
			);
		});

		it("복잡한 meta 객체를 처리합니다", () => {
			const mockDate = new Date("2024-01-01T00:00:00.000Z");
			vi.setSystemTime(mockDate);

			const complexMeta = {
				user: { id: 123, name: "John Doe" },
				context: {
					action: "login",
					timestamp: "2024-01-01T00:00:00.000Z",
					metadata: { source: "web", device: "desktop" },
				},
				tags: ["auth", "security"],
			};

			consoleTransport.log("info", "user action", complexMeta, mockDate);

			expect(console.info).toHaveBeenCalledWith(
				'2024-01-01T00:00:00.000Z [INFO] user action {"user":{"id":123,"name":"John Doe"},"context":{"action":"login","timestamp":"2024-01-01T00:00:00.000Z","metadata":{"source":"web","device":"desktop"}},"tags":["auth","security"]}',
			);
		});
	});
});
