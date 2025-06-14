import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Logger } from "./logger";
import { Transport } from "./types";

describe("Logger", () => {
	let mockTransport: Transport;
	let originalLogLevel: string | undefined;

	beforeEach(() => {
		originalLogLevel = process.env.LOG_LEVEL;

		mockTransport = {
			log: vi.fn(),
		};
		Logger.useTransports(mockTransport);
		vi.clearAllMocks();
	});

	afterEach(() => {
		if (originalLogLevel === undefined) {
			delete process.env.LOG_LEVEL;
		} else {
			process.env.LOG_LEVEL = originalLogLevel;
		}
		vi.clearAllMocks();
	});

	describe("getLevel", () => {
		it("환경변수에서 로그 레벨을 가져옵니다", () => {
			process.env.LOG_LEVEL = "warn";
			Logger.useTransports(mockTransport);

			Logger.info("test message");
			expect(mockTransport.log).not.toHaveBeenCalled();

			Logger.warn("test message");
			expect(mockTransport.log).toHaveBeenCalledWith(
				"warn",
				"test message",
				{},
			);
		});

		it("잘못된 로그 레벨일 때 기본값(debug)을 사용합니다", () => {
			process.env.LOG_LEVEL = "invalid";
			Logger.useTransports(mockTransport);

			Logger.debug("test message");
			expect(mockTransport.log).toHaveBeenCalledWith(
				"debug",
				"test message",
				{},
			);
		});
	});

	describe("shouldLog", () => {
		it("현재 로그 레벨보다 높은 레벨의 로그를 출력합니다", () => {
			process.env.LOG_LEVEL = "warn";
			Logger.useTransports(mockTransport);

			Logger.debug("debug message");
			Logger.info("info message");
			expect(mockTransport.log).not.toHaveBeenCalled();

			Logger.warn("warn message");
			Logger.error("error message");
			expect(mockTransport.log).toHaveBeenCalledTimes(2);
		});
	});

	describe("useTransports", () => {
		it("여러 개의 transport를 설정할 수 있습니다", () => {
			const transport1 = { log: vi.fn() };
			const transport2 = { log: vi.fn() };

			Logger.useTransports(transport1, transport2);
			Logger.info("test message");

			expect(transport1.log).toHaveBeenCalledWith("info", "test message", {});
			expect(transport2.log).toHaveBeenCalledWith("info", "test message", {});
		});
	});

	describe("debug", () => {
		it("debug 레벨 로그를 출력합니다", () => {
			// debug 레벨로 설정
			process.env.LOG_LEVEL = "debug";
			Logger.useTransports(mockTransport);

			const meta = { userId: "123" };
			Logger.debug("debug message", meta);

			expect(mockTransport.log).toHaveBeenCalledWith(
				"debug",
				"debug message",
				meta,
			);
		});

		it("meta 없이 debug 로그를 출력합니다", () => {
			process.env.LOG_LEVEL = "debug";
			Logger.useTransports(mockTransport);

			Logger.debug("debug message");

			expect(mockTransport.log).toHaveBeenCalledWith(
				"debug",
				"debug message",
				{},
			);
		});
	});

	describe("info", () => {
		it("info 레벨 로그를 출력합니다", () => {
			process.env.LOG_LEVEL = "debug";
			Logger.useTransports(mockTransport);

			const meta = { requestId: "abc123" };
			Logger.info("info message", meta);

			expect(mockTransport.log).toHaveBeenCalledWith(
				"info",
				"info message",
				meta,
			);
		});
	});

	describe("warn", () => {
		it("warn 레벨 로그를 출력합니다", () => {
			const meta = { warning: "deprecated API" };
			Logger.warn("warn message", meta);

			expect(mockTransport.log).toHaveBeenCalledWith(
				"warn",
				"warn message",
				meta,
			);
		});
	});

	describe("error", () => {
		it("문자열 에러 메시지로 error 로그를 출력합니다", () => {
			const meta = { context: "user action" };
			Logger.error("error message", meta);

			expect(mockTransport.log).toHaveBeenCalledWith(
				"error",
				"error message",
				meta,
			);
		});

		it("Error 객체로 error 로그를 출력합니다", () => {
			const error = new Error("Something went wrong");
			const meta = { context: "database operation" };

			Logger.error(error, meta);

			expect(mockTransport.log).toHaveBeenCalledWith(
				"error",
				"Something went wrong",
				{ context: "database operation", error },
			);
		});

		it("Error 객체만으로 error 로그를 출력합니다", () => {
			const error = new Error("Something went wrong");

			Logger.error(error);

			expect(mockTransport.log).toHaveBeenCalledWith(
				"error",
				"Something went wrong",
				{ error },
			);
		});
	});
});
