import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApmTransport } from "./apm";
import { ApmClient, LogLevel } from "../types";

describe("ApmTransport", () => {
	let mockApmClient: ApmClient;
	let apmTransport: ApmTransport;

	beforeEach(() => {
		mockApmClient = {
			captureException: vi.fn(),
			captureMessage: vi.fn(),
		};
		apmTransport = new ApmTransport(mockApmClient);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("constructor", () => {
		it("ApmClient를 받아서 인스턴스를 생성합니다", () => {
			const transport = new ApmTransport(mockApmClient);
			expect(transport).toBeInstanceOf(ApmTransport);
		});
	});

	describe("log", () => {
		it("error 레벨이고 meta에 error가 있을 때 captureException을 호출합니다", () => {
			const error = new Error("Something went wrong");
			const meta = { error, context: "user action" };

			apmTransport.log("error", "error message", meta);

			expect(mockApmClient.captureException).toHaveBeenCalledWith(error);
			expect(mockApmClient.captureMessage).not.toHaveBeenCalled();
		});

		it("error 레벨이지만 meta에 error가 없을 때 captureMessage를 호출합니다", () => {
			const meta = { context: "database operation" };

			apmTransport.log("error", "error message", meta);

			expect(mockApmClient.captureMessage).toHaveBeenCalledWith(
				"error message",
				{ level: "error" },
			);
			expect(mockApmClient.captureException).not.toHaveBeenCalled();
		});

		it("error 레벨이지만 meta가 없을 때 captureMessage를 호출합니다", () => {
			apmTransport.log("error", "error message");

			expect(mockApmClient.captureMessage).toHaveBeenCalledWith(
				"error message",
				{ level: "error" },
			);
			expect(mockApmClient.captureException).not.toHaveBeenCalled();
		});

		it("debug 레벨 로그에 대해 captureMessage를 호출합니다", () => {
			const meta = { userId: "123" };

			apmTransport.log("debug", "debug message", meta);

			expect(mockApmClient.captureMessage).toHaveBeenCalledWith(
				"debug message",
				{ level: "debug" },
			);
			expect(mockApmClient.captureException).not.toHaveBeenCalled();
		});

		it("info 레벨 로그에 대해 captureMessage를 호출합니다", () => {
			const meta = { requestId: "abc123" };

			apmTransport.log("info", "info message", meta);

			expect(mockApmClient.captureMessage).toHaveBeenCalledWith(
				"info message",
				{ level: "info" },
			);
			expect(mockApmClient.captureException).not.toHaveBeenCalled();
		});

		it("warn 레벨 로그에 대해 captureMessage를 호출합니다", () => {
			apmTransport.log("warn", "warning message");

			expect(mockApmClient.captureMessage).toHaveBeenCalledWith(
				"warning message",
				{ level: "warn" },
			);
			expect(mockApmClient.captureException).not.toHaveBeenCalled();
		});

		it("meta에 error가 있으면 타입에 관계없이 captureException을 호출합니다", () => {
			const meta = { error: "string error", context: "test" };

			apmTransport.log("error", "error message", meta);

			expect(mockApmClient.captureException).toHaveBeenCalledWith(
				"string error",
			);
			expect(mockApmClient.captureMessage).not.toHaveBeenCalled();
		});

		it("meta에 Error 객체가 있을 때만 captureException을 호출합니다", () => {
			const actualError = new Error("Actual error object");
			const meta = {
				error: actualError,
				otherError: "string error",
				context: "test",
			};

			apmTransport.log("error", "error message", meta);

			expect(mockApmClient.captureException).toHaveBeenCalledWith(actualError);
			expect(mockApmClient.captureMessage).not.toHaveBeenCalled();
		});

		it("모든 로그 레벨에 대해 올바른 level 파라미터를 전달합니다", () => {
			const testCases: LogLevel[] = ["debug", "info", "warn", "error"];

			testCases.forEach((level) => {
				apmTransport.log(level, `${level} message`);
			});

			expect(mockApmClient.captureMessage).toHaveBeenCalledWith(
				"debug message",
				{ level: "debug" },
			);
			expect(mockApmClient.captureMessage).toHaveBeenCalledWith(
				"info message",
				{ level: "info" },
			);
			expect(mockApmClient.captureMessage).toHaveBeenCalledWith(
				"warn message",
				{ level: "warn" },
			);
			expect(mockApmClient.captureMessage).toHaveBeenCalledWith(
				"error message",
				{ level: "error" },
			);
		});

		it("복잡한 meta 객체와 함께 동작합니다", () => {
			const complexMeta = {
				user: { id: 123, name: "John Doe" },
				context: { action: "login", timestamp: "2024-01-01" },
				tags: ["auth", "security"],
				metadata: { source: "web", device: "desktop" },
			};

			apmTransport.log("info", "complex log entry", complexMeta);

			expect(mockApmClient.captureMessage).toHaveBeenCalledWith(
				"complex log entry",
				{ level: "info" },
			);
		});
	});
});
