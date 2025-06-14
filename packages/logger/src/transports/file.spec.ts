import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import { FileTransport } from "./file";

vi.mock("fs");

describe("FileTransport", () => {
	let fileTransport: FileTransport;
	let mockWriteStream: {
		write: ReturnType<typeof vi.fn>;
	};
	const testFilePath = "/tmp/test.log";

	beforeEach(() => {
		mockWriteStream = {
			write: vi.fn(),
		};

		vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream as any);
		fileTransport = new FileTransport(testFilePath);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("constructor", () => {
		it("지정된 경로에 WriteStream을 생성합니다", () => {
			expect(fs.createWriteStream).toHaveBeenCalledWith(testFilePath, {
				flags: "a",
			});
		});
	});

	describe("log", () => {
		it("debug 레벨 로그를 파일에 작성합니다", () => {
			const mockDate = new Date("2024-01-01T00:00:00.000Z");
			vi.setSystemTime(mockDate);

			fileTransport.log("debug", "debug message");

			expect(mockWriteStream.write).toHaveBeenCalledWith(
				"2024-01-01T00:00:00.000Z [DEBUG] debug message {}\n",
			);
		});

		it("info 레벨 로그를 파일에 작성합니다", () => {
			const mockDate = new Date("2024-01-01T12:30:45.123Z");
			vi.setSystemTime(mockDate);

			const meta = { userId: "123", action: "login" };
			fileTransport.log("info", "user logged in", meta);

			expect(mockWriteStream.write).toHaveBeenCalledWith(
				'2024-01-01T12:30:45.123Z [INFO] user logged in {"userId":"123","action":"login"}\n',
			);
		});

		it("warn 레벨 로그를 파일에 작성합니다", () => {
			const mockDate = new Date("2024-01-01T09:15:30.456Z");
			vi.setSystemTime(mockDate);

			fileTransport.log("warn", "warning message");

			expect(mockWriteStream.write).toHaveBeenCalledWith(
				"2024-01-01T09:15:30.456Z [WARN] warning message {}\n",
			);
		});

		it("error 레벨 로그를 파일에 작성합니다", () => {
			const mockDate = new Date("2024-01-01T18:45:00.789Z");
			vi.setSystemTime(mockDate);

			const meta = { error: "Database connection failed", retryCount: 3 };
			fileTransport.log("error", "connection error", meta);

			expect(mockWriteStream.write).toHaveBeenCalledWith(
				'2024-01-01T18:45:00.789Z [ERROR] connection error {"error":"Database connection failed","retryCount":3}\n',
			);
		});

		it("meta가 없을 때 빈 객체로 처리합니다", () => {
			const mockDate = new Date("2024-01-01T00:00:00.000Z");
			vi.setSystemTime(mockDate);

			fileTransport.log("info", "simple message");

			expect(mockWriteStream.write).toHaveBeenCalledWith(
				"2024-01-01T00:00:00.000Z [INFO] simple message {}\n",
			);
		});

		it("복잡한 meta 객체를 JSON으로 직렬화합니다", () => {
			const mockDate = new Date("2024-01-01T00:00:00.000Z");
			vi.setSystemTime(mockDate);

			const complexMeta = {
				user: { id: 123, name: "John Doe" },
				tags: ["authentication", "security"],
				timestamp: "2024-01-01",
				nested: { level: 1, data: { value: "test" } },
			};

			fileTransport.log("info", "complex log", complexMeta);

			const expectedMeta = JSON.stringify(complexMeta);
			expect(mockWriteStream.write).toHaveBeenCalledWith(
				`2024-01-01T00:00:00.000Z [INFO] complex log ${expectedMeta}\n`,
			);
		});
	});
});
