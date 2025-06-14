import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { DailyFileTransport, DailyFileTransportOptions } from "./daily-file";
import { JsonFormatter, SimpleFormatter } from "../formatters";
import * as fsUtils from "../utils/fs";

vi.mock("fs");
vi.mock("path");
vi.mock("../utils/fs");

describe("DailyFileTransport", () => {
	let mockWriteStream: {
		write: ReturnType<typeof vi.fn>;
		end: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		mockWriteStream = {
			write: vi.fn(),
			end: vi.fn(),
		};

		// 기본 모킹 설정
		vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream as any);
		vi.mocked(fs.existsSync).mockReturnValue(false);
		vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
		vi.mocked(fs.readdirSync).mockReturnValue([]);
		vi.mocked(fs.unlinkSync).mockReturnValue(undefined);
		vi.mocked(path.join).mockImplementation((...args) => args.join("/"));

		// 파일시스템 유틸리티 모킹
		vi.mocked(fsUtils.ensureDirectory).mockReturnValue(true);
		vi.mocked(fsUtils.createWriteStream).mockReturnValue(
			mockWriteStream as any,
		);
		vi.mocked(fsUtils.listFilesWithPattern).mockReturnValue([]);
		vi.mocked(fsUtils.deleteFile).mockReturnValue(true);
		vi.mocked(fsUtils.joinPath).mockImplementation((...args) => args.join("/"));
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("constructor", () => {
		it("기본 옵션으로 초기화됩니다", () => {
			const options: DailyFileTransportOptions = {
				logDirectory: "/tmp/logs",
			};

			new DailyFileTransport(options);

			expect(fsUtils.ensureDirectory).toHaveBeenCalledWith("/tmp/logs");
		});

		it("커스텀 옵션으로 초기화됩니다", () => {
			const options: DailyFileTransportOptions = {
				logDirectory: "/var/logs",
				fileNamePattern: "myapp",
				maxDays: 14,
				formatter: new JsonFormatter(),
			};

			new DailyFileTransport(options);

			expect(fsUtils.ensureDirectory).toHaveBeenCalledWith("/var/logs");
		});

		it("디렉토리가 이미 존재하면 생성하지 않습니다", () => {
			vi.mocked(fs.existsSync).mockReturnValue(true);

			const options: DailyFileTransportOptions = {
				logDirectory: "/existing/logs",
			};

			new DailyFileTransport(options);

			expect(fs.mkdirSync).not.toHaveBeenCalled();
		});
	});

	describe("log", () => {
		it("현재 날짜의 파일에 로그를 작성합니다", () => {
			const mockDate = new Date("2024-01-15T10:30:00.000Z");
			vi.setSystemTime(mockDate);

			const transport = new DailyFileTransport({
				logDirectory: "/tmp/logs",
				fileNamePattern: "app",
			});

			transport.log("info", "test message", { userId: "123" });

			expect(fsUtils.createWriteStream).toHaveBeenCalledWith(
				"/tmp/logs/app-2024-01-15.log",
				{ flags: "a" },
			);
			expect(mockWriteStream.write).toHaveBeenCalled();
		});

		it("날짜가 바뀌면 새로운 파일 스트림을 생성합니다", () => {
			const transport = new DailyFileTransport({
				logDirectory: "/tmp/logs",
				fileNamePattern: "service",
			});

			// 첫 번째 날짜
			vi.setSystemTime(new Date("2024-01-15T23:59:00.000Z"));
			transport.log("info", "message 1");

			expect(fsUtils.createWriteStream).toHaveBeenCalledWith(
				"/tmp/logs/service-2024-01-15.log",
				{ flags: "a" },
			);

			// 날짜 변경
			vi.setSystemTime(new Date("2024-01-16T00:01:00.000Z"));
			transport.log("info", "message 2");

			expect(fsUtils.createWriteStream).toHaveBeenCalledWith(
				"/tmp/logs/service-2024-01-16.log",
				{ flags: "a" },
			);

			// 이전 스트림이 종료되었는지 확인
			expect(mockWriteStream.end).toHaveBeenCalled();
		});

		it("커스텀 포맷터를 사용합니다", () => {
			const mockDate = new Date("2024-01-15T10:30:00.000Z");
			vi.setSystemTime(mockDate);

			const transport = new DailyFileTransport({
				logDirectory: "/tmp/logs",
				formatter: new SimpleFormatter(),
			});

			transport.log("warn", "warning message", { code: 404 }, mockDate);

			// SimpleFormatter 형식으로 작성되었는지 확인
			const writeCall = mockWriteStream.write.mock.calls[0][0];
			expect(writeCall).toContain("10:30:00 warn ");
			expect(writeCall).toContain("warning message");
		});
	});

	describe("file cleanup", () => {
		it("오래된 로그 파일을 정리합니다", () => {
			const mockDate = new Date("2024-01-15T10:00:00.000Z");
			vi.setSystemTime(mockDate);

			// 오래된 파일들이 있다고 가정
			vi.mocked(fsUtils.listFilesWithPattern).mockReturnValue([
				"app-2023-12-10.log", // 36일 전 (삭제되어야 함)
				"app-2024-01-01.log", // 14일 전 (유지되어야 함)
				"app-2024-01-14.log", // 1일 전 (유지되어야 함)
			]);

			new DailyFileTransport({
				logDirectory: "/tmp/logs",
				fileNamePattern: "app",
				maxDays: 30,
			});

			// 30일보다 오래된 파일만 삭제되어야 함
			expect(fsUtils.deleteFile).toHaveBeenCalledWith(
				"/tmp/logs/app-2023-12-10.log",
			);
			expect(fsUtils.deleteFile).toHaveBeenCalledTimes(1);
		});

		it("수동 정리를 실행할 수 있습니다", () => {
			const transport = new DailyFileTransport({
				logDirectory: "/tmp/logs",
				maxDays: 7,
			});

			vi.mocked(fsUtils.listFilesWithPattern).mockReturnValue([
				"app-2024-01-01.log",
			]);

			transport.manualCleanup();

			expect(fsUtils.listFilesWithPattern).toHaveBeenCalled();
		});

		it("파일 정리 중 에러가 발생해도 계속 동작합니다", () => {
			vi.mocked(fs.readdirSync).mockImplementation(() => {
				throw new Error("Permission denied");
			});

			// 에러가 발생해도 생성자가 성공해야 함
			expect(() => {
				new DailyFileTransport({
					logDirectory: "/tmp/logs",
				});
			}).not.toThrow();
		});
	});

	describe("close", () => {
		it("현재 스트림을 닫습니다", () => {
			const transport = new DailyFileTransport({
				logDirectory: "/tmp/logs",
			});

			// 스트림을 생성하기 위해 로그 작성
			transport.log("info", "test");

			transport.close();

			expect(mockWriteStream.end).toHaveBeenCalled();
		});

		it("스트림이 없을 때도 안전하게 동작합니다", () => {
			const transport = new DailyFileTransport({
				logDirectory: "/tmp/logs",
			});

			// 로그를 작성하지 않은 상태에서 close 호출
			expect(() => transport.close()).not.toThrow();
		});
	});

	describe("date formatting", () => {
		it("다양한 날짜를 올바르게 포맷팅합니다", () => {
			const dates = [
				new Date("2024-01-01T00:00:00.000Z"),
				new Date("2024-12-31T23:59:59.999Z"),
				new Date("2024-02-29T12:00:00.000Z"), // 윤년
			];

			const transport = new DailyFileTransport({
				logDirectory: "/tmp/logs",
				fileNamePattern: "test",
			});

			dates.forEach((date, index) => {
				vi.setSystemTime(date);
				transport.log("info", `message ${index}`);
			});

			expect(fsUtils.createWriteStream).toHaveBeenCalledWith(
				"/tmp/logs/test-2024-01-01.log",
				{ flags: "a" },
			);
			expect(fsUtils.createWriteStream).toHaveBeenCalledWith(
				"/tmp/logs/test-2024-12-31.log",
				{ flags: "a" },
			);
			expect(fsUtils.createWriteStream).toHaveBeenCalledWith(
				"/tmp/logs/test-2024-02-29.log",
				{ flags: "a" },
			);
		});
	});
});
