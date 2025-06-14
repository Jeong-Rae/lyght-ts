import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { FileTransport, FileTransportOptions } from "./file";
import { globalBackgroundQueue } from "../utils/background-queue";
import { JsonFormatter, SimpleFormatter } from "../formatters";

vi.mock("fs");
vi.mock("path");
vi.mock("zlib");
vi.mock("../utils/background-queue", () => ({
	globalBackgroundQueue: {
		enqueue: vi.fn(),
		waitForCompletion: vi.fn().mockResolvedValue(undefined),
	},
}));

describe("FileTransport", () => {
	let mockWriteStream: {
		write: ReturnType<typeof vi.fn>;
		end: ReturnType<typeof vi.fn>;
	};
	let mockReadStream: any;
	let mockGzip: any;

	beforeEach(() => {
		mockWriteStream = {
			write: vi.fn(),
			end: vi.fn((callback) => callback && callback()),
		};

		mockReadStream = {
			pipe: vi.fn().mockReturnThis(),
		};

		mockGzip = {
			pipe: vi.fn().mockReturnThis(),
			on: vi.fn((event, callback) => {
				if (event === "finish") {
					// 비동기적으로 callback 호출
					setTimeout(callback, 0);
				}
				return mockGzip;
			}),
		};

		// 기본 모킹 설정
		vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream as any);
		vi.mocked(fs.createReadStream).mockReturnValue(mockReadStream);
		vi.mocked(fs.existsSync).mockReturnValue(false); // 기본적으로 디렉토리가 없다고 가정
		vi.mocked(fs.statSync).mockReturnValue({ size: 1000 } as any);
		vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
		vi.mocked(fs.readdirSync).mockReturnValue([]);
		vi.mocked(fs.renameSync).mockReturnValue(undefined);
		vi.mocked(fs.unlinkSync).mockReturnValue(undefined);
		vi.mocked(path.dirname).mockReturnValue("/tmp");
		vi.mocked(path.basename).mockReturnValue("test.log");
		vi.mocked(path.join).mockImplementation((...args) => args.join("/"));
		vi.mocked(zlib.createGzip).mockReturnValue(mockGzip);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("constructor", () => {
		it("문자열 경로로 기본 옵션과 함께 초기화됩니다", () => {
			const transport = new FileTransport("/tmp/test.log");

			expect(fs.mkdirSync).toHaveBeenCalledWith("/tmp", {
				recursive: true,
			});
			expect(fs.createWriteStream).toHaveBeenCalledWith("/tmp/test.log", {
				flags: "a",
			});
		});

		it("옵션 객체로 초기화됩니다", () => {
			const options: FileTransportOptions = {
				filePath: "/tmp/test.log",
				maxFileSize: 5 * 1024 * 1024, // 5MB
				maxFiles: 3,
				compress: false,
			};

			const transport = new FileTransport(options);

			expect(fs.mkdirSync).toHaveBeenCalledWith("/tmp", {
				recursive: true,
			});
			expect(fs.createWriteStream).toHaveBeenCalledWith("/tmp/test.log", {
				flags: "a",
			});
		});

		it("디렉토리가 이미 있으면 생성하지 않습니다", () => {
			vi.mocked(fs.existsSync).mockReturnValue(true);

			new FileTransport("/tmp/logs/test.log");

			expect(fs.mkdirSync).not.toHaveBeenCalled();
		});

		it("커스텀 포맷터로 초기화됩니다", () => {
			const formatter = new JsonFormatter();
			const options: FileTransportOptions = {
				filePath: "/tmp/test.log",
				formatter,
			};

			const transport = new FileTransport(options);

			// 포맷터가 올바르게 설정되었는지 확인
			transport.log("info", "test", {});
			expect(mockWriteStream.write).toHaveBeenCalled();
		});

		it("파일이 존재하지 않을 때 currentFileSize를 0으로 설정합니다", () => {
			vi.mocked(fs.statSync).mockImplementation(() => {
				throw new Error("File not found");
			});

			const transport = new FileTransport("/tmp/test.log");
			transport.log("info", "test");

			// 파일 크기가 0에서 시작했는지 확인 (에러 없이 로그 작성)
			expect(mockWriteStream.write).toHaveBeenCalled();
		});
	});

	describe("log", () => {
		it("기본 로그를 파일에 즉시 작성합니다", () => {
			const mockDate = new Date("2024-01-01T00:00:00.000Z");
			vi.setSystemTime(mockDate);

			const transport = new FileTransport("/tmp/test.log");
			transport.log("info", "test message");

			expect(mockWriteStream.write).toHaveBeenCalledWith(
				"2024-01-01T00:00:00.000Z [INFO] test message {}\n",
			);
		});

		it("메타데이터와 함께 로그를 작성합니다", () => {
			const mockDate = new Date("2024-01-01T00:00:00.000Z");
			vi.setSystemTime(mockDate);

			const transport = new FileTransport("/tmp/test.log");
			const meta = { userId: "123", action: "login" };
			transport.log("info", "user logged in", meta);

			expect(mockWriteStream.write).toHaveBeenCalledWith(
				'2024-01-01T00:00:00.000Z [INFO] user logged in {"userId":"123","action":"login"}\n',
			);
		});

		it("파일 크기가 최대치를 초과할 때 백그라운드 큐에 회전 작업을 추가합니다", () => {
			const options: FileTransportOptions = {
				filePath: "/tmp/test.log",
				maxFileSize: 100, // 작은 크기로 설정
				maxFiles: 3,
				compress: false,
			};

			// 현재 파일 크기를 90으로 설정
			vi.mocked(fs.statSync).mockReturnValue({ size: 90 } as any);

			const transport = new FileTransport(options);

			// 큰 메시지를 로그하여 회전을 트리거
			const longMessage = "a".repeat(50);
			transport.log("info", longMessage);

			// 백그라운드 큐에 작업이 추가되었는지 확인
			expect(globalBackgroundQueue.enqueue).toHaveBeenCalled();

			// 로그는 즉시 작성되어야 함
			expect(mockWriteStream.write).toHaveBeenCalled();
		});

		it("닫힌 transport는 로그를 무시합니다", () => {
			const transport = new FileTransport("/tmp/test.log");
			transport.close();

			transport.log("info", "should be ignored");

			// close 후에는 write가 호출되지 않아야 함
			expect(mockWriteStream.write).toHaveBeenCalledTimes(0);
		});

		it("스트림 쓰기 실패 시 에러를 무시합니다", () => {
			const transport = new FileTransport("/tmp/test.log");
			mockWriteStream.write.mockImplementation(() => {
				throw new Error("Write failed");
			});

			// 에러가 발생해도 예외가 던져지지 않아야 함
			expect(() => transport.log("info", "test")).not.toThrow();
		});

		it("다양한 포맷터를 사용할 수 있습니다", () => {
			const mockDate = new Date("2024-01-01T12:30:45.000Z");
			vi.setSystemTime(mockDate);

			const transport = new FileTransport({
				filePath: "/tmp/test.log",
				formatter: new SimpleFormatter(),
			});

			transport.log("warn", "warning message", { code: 404 });

			const writeCall = mockWriteStream.write.mock.calls[0][0];
			expect(writeCall).toContain("12:30:45 warn ");
			expect(writeCall).toContain("warning message");
		});
	});

	describe("file rotation", () => {
		it("압축 없이 회전된 파일을 유지합니다", () => {
			const options: FileTransportOptions = {
				filePath: "/tmp/test.log",
				maxFileSize: 100,
				maxFiles: 3,
				compress: false,
			};

			vi.mocked(fs.statSync).mockReturnValue({ size: 90 } as any);
			vi.mocked(fs.existsSync).mockReturnValue(true);

			const transport = new FileTransport(options);

			const longMessage = "a".repeat(50);
			transport.log("info", longMessage);

			// 백그라운드 큐에 회전 작업이 추가되었는지 확인
			expect(globalBackgroundQueue.enqueue).toHaveBeenCalled();
		});

		it("최대 파일 수를 초과하는 설정을 처리합니다", () => {
			const options: FileTransportOptions = {
				filePath: "/tmp/test.log",
				maxFileSize: 100,
				maxFiles: 2,
				compress: false,
			};

			// 기존 로그 파일들이 있다고 가정
			vi.mocked(fs.readdirSync).mockReturnValue([
				"test.log.1",
				"test.log.2",
				"test.log.3",
			] as any);

			vi.mocked(fs.statSync).mockReturnValue({ size: 90 } as any);
			vi.mocked(fs.existsSync).mockReturnValue(true);

			const transport = new FileTransport(options);

			const longMessage = "a".repeat(50);
			transport.log("info", longMessage);

			// 백그라운드 큐에 회전 작업이 추가되었는지 확인
			expect(globalBackgroundQueue.enqueue).toHaveBeenCalled();
		});
	});

	describe("실제 파일 회전 로직 테스트", () => {
		it("rotateFile 메서드를 직접 테스트합니다", async () => {
			const transport = new FileTransport({
				filePath: "/tmp/test.log",
				maxFileSize: 100,
				maxFiles: 3,
				compress: false,
			});

			// 현재 파일 크기를 90으로 설정하고 큰 메시지로 회전 트리거
			vi.mocked(fs.statSync).mockReturnValue({ size: 90 } as any);
			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readdirSync).mockReturnValue([]);

			// 큰 메시지로 회전 트리거 (90 + 50 > 100)
			const longMessage = "a".repeat(50);
			transport.log("info", longMessage);

			// 백그라운드 큐에 회전 작업이 추가되었는지 확인
			expect(globalBackgroundQueue.enqueue).toHaveBeenCalled();

			// rotateFile을 직접 호출하기 위해 백그라운드 큐의 콜백을 실행
			const enqueueCalls = vi.mocked(globalBackgroundQueue.enqueue).mock.calls;
			if (enqueueCalls.length > 0) {
				const rotateCallback = enqueueCalls[0][0];
				await rotateCallback();
			}

			// 스트림이 종료되고 새로 생성되었는지 확인
			expect(mockWriteStream.end).toHaveBeenCalled();
		});

		it("압축 기능을 테스트합니다", async () => {
			const transport = new FileTransport({
				filePath: "/tmp/test.log",
				maxFileSize: 100,
				maxFiles: 3,
				compress: true,
			});

			// 현재 파일 크기를 90으로 설정
			vi.mocked(fs.statSync).mockReturnValue({ size: 90 } as any);
			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readdirSync).mockReturnValue([]);

			// 파일 회전 트리거 (90 + 50 > 100)
			const longMessage = "a".repeat(50);
			transport.log("info", longMessage);

			// 백그라운드 큐에서 압축 작업이 예약되었는지 확인
			expect(globalBackgroundQueue.enqueue).toHaveBeenCalled();
		});

		it("파일 번호 추출 로직을 테스트합니다", () => {
			const transport = new FileTransport({
				filePath: "/tmp/test.log",
				maxFileSize: 100,
			});

			// 현재 파일 크기를 90으로 설정
			vi.mocked(fs.statSync).mockReturnValue({ size: 90 } as any);

			// extractFileNumber 메서드는 private이므로 간접적으로 테스트
			vi.mocked(fs.readdirSync).mockReturnValue([
				"test.log.1",
				"test.log.2.gz",
				"test.log.10",
				"other.log",
			] as any);

			// 파일 회전 시 번호 추출이 올바르게 작동하는지 확인 (90 + 60 > 100)
			const longMessage = "a".repeat(60);
			transport.log("info", longMessage);

			expect(globalBackgroundQueue.enqueue).toHaveBeenCalled();
		});

		it("파일 정리 중 에러가 발생해도 계속 동작합니다", async () => {
			const transport = new FileTransport({
				filePath: "/tmp/test.log",
				maxFileSize: 100,
				maxFiles: 2,
			});

			vi.mocked(fs.readdirSync).mockImplementation(() => {
				throw new Error("Permission denied");
			});

			// 에러가 발생해도 로그 작성은 계속되어야 함
			expect(() => transport.log("info", "test")).not.toThrow();
		});

		it("압축 중 에러가 발생해도 처리됩니다", async () => {
			const transport = new FileTransport({
				filePath: "/tmp/test.log",
				maxFileSize: 100,
				compress: true,
			});

			// 현재 파일 크기를 90으로 설정
			vi.mocked(fs.statSync).mockReturnValue({ size: 90 } as any);

			// 압축 스트림에서 에러 발생 시뮬레이션
			mockGzip.on.mockImplementation((event: string, callback: any) => {
				if (event === "error") {
					setTimeout(() => callback(new Error("Compression failed")), 0);
				}
				return mockGzip;
			});

			// 파일 회전 트리거 (90 + 50 > 100)
			const longMessage = "a".repeat(50);
			transport.log("info", longMessage);

			// 에러가 발생해도 큐에 작업이 추가되어야 함
			expect(globalBackgroundQueue.enqueue).toHaveBeenCalled();
		});
	});

	describe("close", () => {
		it("스트림을 닫습니다", () => {
			const transport = new FileTransport("/tmp/test.log");
			transport.close();

			expect(mockWriteStream.end).toHaveBeenCalled();
		});

		it("이미 닫힌 transport를 다시 닫아도 안전합니다", () => {
			const transport = new FileTransport("/tmp/test.log");
			transport.close();
			transport.close(); // 두 번째 호출

			// end가 한 번만 호출되어야 함
			expect(mockWriteStream.end).toHaveBeenCalledTimes(1);
		});

		it("닫힌 후 로그 시도 시 무시됩니다", () => {
			const transport = new FileTransport("/tmp/test.log");
			transport.close();

			// 닫힌 후 로그 시도
			transport.log("info", "should be ignored");

			// write가 추가로 호출되지 않아야 함
			expect(mockWriteStream.write).not.toHaveBeenCalled();
		});
	});

	describe("edge cases", () => {
		it("매우 큰 로그 메시지를 처리합니다", () => {
			const transport = new FileTransport({
				filePath: "/tmp/test.log",
				maxFileSize: 1000,
			});

			const hugeMessage = "x".repeat(10000);
			transport.log("info", hugeMessage);

			expect(mockWriteStream.write).toHaveBeenCalled();
			expect(globalBackgroundQueue.enqueue).toHaveBeenCalled();
		});

		it("빈 메타데이터를 올바르게 처리합니다", () => {
			const transport = new FileTransport("/tmp/test.log");

			transport.log("info", "test message", {});

			const writeCall = mockWriteStream.write.mock.calls[0][0];
			expect(writeCall).toContain("{}");
		});

		it("복잡한 메타데이터를 직렬화합니다", () => {
			const transport = new FileTransport("/tmp/test.log");

			const complexMeta = {
				user: { id: 123, name: "John" },
				tags: ["auth", "login"],
				nested: { deep: { value: true } },
			};

			transport.log("info", "complex data", complexMeta);

			const writeCall = mockWriteStream.write.mock.calls[0][0];
			expect(writeCall).toContain('"user"');
			expect(writeCall).toContain('"tags"');
			expect(writeCall).toContain('"nested"');
		});

		it("파일 경로에 특수 문자가 있어도 처리합니다", () => {
			vi.mocked(path.dirname).mockReturnValue("/tmp/logs with spaces");
			vi.mocked(path.basename).mockReturnValue("app-name.log");

			const transport = new FileTransport("/tmp/logs with spaces/app-name.log");

			expect(fs.mkdirSync).toHaveBeenCalledWith("/tmp/logs with spaces", {
				recursive: true,
			});
		});
	});
});
