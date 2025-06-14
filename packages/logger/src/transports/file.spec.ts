import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { FileTransport, FileTransportOptions } from "./file";
import { globalBackgroundQueue } from "../utils/background-queue";

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

			expect(fs.mkdirSync).toHaveBeenCalledWith("/tmp", { recursive: true });
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

			expect(fs.mkdirSync).toHaveBeenCalledWith("/tmp", { recursive: true });
			expect(fs.createWriteStream).toHaveBeenCalledWith("/tmp/test.log", {
				flags: "a",
			});
		});

		it("디렉토리가 이미 있으면 생성하지 않습니다", () => {
			vi.mocked(fs.existsSync).mockReturnValue(true);

			new FileTransport("/tmp/logs/test.log");

			expect(fs.mkdirSync).not.toHaveBeenCalled();
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

	describe("close", () => {
		it("스트림을 닫습니다", () => {
			const transport = new FileTransport("/tmp/test.log");
			transport.close();

			expect(mockWriteStream.end).toHaveBeenCalled();
		});
	});
});
