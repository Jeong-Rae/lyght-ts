import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JsonFormatter, SimpleFormatter } from '../formatters';
import { globalBackgroundQueue } from '../utils/background-queue';
import * as fsUtils from '../utils/fs';
import { FileTransport, type FileTransportOptions } from './file';

vi.mock('fs');
vi.mock('path');
vi.mock('zlib');
vi.mock('../utils/fs');
vi.mock('../utils/background-queue');

describe('FileTransport', () => {
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
    // biome-ignore lint/suspicious/noExplicitAny: test code
    vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream as any);
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    vi.mocked(fs.readdirSync).mockReturnValue([]);
    vi.mocked(fs.unlinkSync).mockReturnValue(undefined);
    // biome-ignore lint/suspicious/noExplicitAny: test code
    vi.mocked(fs.statSync).mockReturnValue({ size: 0 } as any);
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
    vi.mocked(path.dirname).mockImplementation((p) => p.split('/').slice(0, -1).join('/'));
    vi.mocked(path.basename).mockImplementation((p) => p.split('/').pop() || '');
    vi.mocked(path.extname).mockImplementation((p) => {
      const parts = p.split('.');
      return parts.length > 1 ? `.${parts.pop()}` : '';
    });

    // 파일시스템 유틸리티 모킹
    vi.mocked(fsUtils.exists).mockReturnValue(false);
    vi.mocked(fsUtils.getFileSize).mockReturnValue(0);
    vi.mocked(fsUtils.ensureFileDirectory).mockReturnValue(true);
    vi.mocked(fsUtils.ensureDirectory).mockReturnValue(true);
    // biome-ignore lint/suspicious/noExplicitAny: test code
    vi.mocked(fsUtils.createWriteStream).mockReturnValue(mockWriteStream as any);
    vi.mocked(fsUtils.listFiles).mockReturnValue([]);
    vi.mocked(fsUtils.listFilesWithPattern).mockReturnValue([]);
    vi.mocked(fsUtils.deleteFile).mockReturnValue(true);
    vi.mocked(fsUtils.moveFile).mockReturnValue(true);
    vi.mocked(fsUtils.compressFile).mockResolvedValue(true);
    vi.mocked(fsUtils.getDirectory).mockImplementation((p) => p.split('/').slice(0, -1).join('/'));
    vi.mocked(fsUtils.getBaseName).mockImplementation((p) => {
      const name = p.split('/').pop() || '';
      const dotIndex = name.lastIndexOf('.');
      return dotIndex > 0 ? name.substring(0, dotIndex) : name;
    });
    vi.mocked(fsUtils.getExtension).mockImplementation((p) => {
      const parts = p.split('.');
      return parts.length > 1 ? `.${parts.pop()}` : '';
    });
    vi.mocked(fsUtils.joinPath).mockImplementation((...args) => args.join('/'));

    // Background queue 모킹
    vi.mocked(globalBackgroundQueue.enqueue).mockImplementation((fn) => {
      fn(); // 즉시 실행
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('문자열 경로로 초기화됩니다 (기본 크기 기반)', () => {
      new FileTransport('./logs/app.log');

      expect(fsUtils.ensureFileDirectory).toHaveBeenCalledWith('./logs/app.log');
      expect(fsUtils.getFileSize).toHaveBeenCalledWith('./logs/app.log');
      expect(fsUtils.createWriteStream).toHaveBeenCalledWith('./logs/app.log', {
        flags: 'a',
      });
    });

    it('크기 기반 롤링으로 초기화됩니다', () => {
      const options: FileTransportOptions = {
        filePath: './logs/app.log',
        rotation: 'size',
        maxFileSize: 5 * 1024 * 1024,
        cleanup: { maxFiles: 3 },
      };

      new FileTransport(options);

      expect(fsUtils.ensureFileDirectory).toHaveBeenCalledWith('./logs/app.log');
    });

    it('날짜 기반 롤링으로 초기화됩니다', () => {
      const options: FileTransportOptions = {
        filePath: './logs',
        rotation: 'date',
        fileNamePattern: 'myapp',
        cleanup: { maxDays: 14 },
      };

      new FileTransport(options);

      expect(fsUtils.ensureDirectory).toHaveBeenCalledWith('./logs');
    });

    it('하이브리드 롤링으로 초기화됩니다', () => {
      const options: FileTransportOptions = {
        filePath: './logs',
        rotation: 'hybrid',
        maxFileSize: 10 * 1024 * 1024,
        cleanup: { maxFiles: 5, maxDays: 30 },
      };

      new FileTransport(options);

      expect(fsUtils.ensureDirectory).toHaveBeenCalledWith('./logs');
    });
  });

  describe('크기 기반 로깅', () => {
    it('크기 기반으로 로그를 작성합니다', () => {
      const transport = new FileTransport({
        filePath: './logs/app.log',
        rotation: 'size',
      });

      transport.log('info', 'test message', { userId: '123' });

      expect(mockWriteStream.write).toHaveBeenCalled();
    });

    it('파일 크기 초과 시 회전을 트리거합니다', () => {
      vi.mocked(fsUtils.getFileSize).mockReturnValue(9 * 1024 * 1024); // 9MB

      const transport = new FileTransport({
        filePath: './logs/app.log',
        rotation: 'size',
        maxFileSize: 10 * 1024 * 1024, // 10MB
      });

      // 2MB 메시지 (총 11MB가 되어 초과)
      const largeMessage = 'x'.repeat(2 * 1024 * 1024);
      transport.log('info', largeMessage);

      expect(globalBackgroundQueue.enqueue).toHaveBeenCalled();
    });

    it('파일 회전 시 압축을 수행합니다', () => {
      // 파일이 존재한다고 설정
      vi.mocked(fsUtils.exists).mockReturnValue(true);
      vi.mocked(fsUtils.listFiles).mockReturnValue([]);

      // 초기 파일 크기를 9MB로 설정
      vi.mocked(fsUtils.getFileSize).mockReturnValue(9 * 1024 * 1024);

      const transport = new FileTransport({
        filePath: './logs/app.log',
        rotation: 'size',
        compress: true,
        maxFileSize: 10 * 1024 * 1024,
      });

      // 2MB 메시지로 총 11MB가 되어 회전 트리거
      const largeMessage = 'x'.repeat(2 * 1024 * 1024);
      transport.log('info', largeMessage);

      // 백그라운드 큐에 회전 작업이 추가되었는지 확인
      expect(globalBackgroundQueue.enqueue).toHaveBeenCalled();
    });
  });

  describe('날짜 기반 로깅', () => {
    it('날짜 기반으로 로그를 작성합니다', () => {
      const mockDate = new Date('2024-01-15T10:30:00.000Z');
      vi.setSystemTime(mockDate);

      const transport = new FileTransport({
        filePath: './logs',
        rotation: 'date',
        fileNamePattern: 'app',
      });

      transport.log('info', 'test message', { userId: '123' });

      expect(fsUtils.createWriteStream).toHaveBeenCalledWith('./logs/app-2024-01-15.log', { flags: 'a' });
    });

    it('날짜가 바뀌면 새로운 파일 스트림을 생성합니다', () => {
      const transport = new FileTransport({
        filePath: './logs',
        rotation: 'date',
        fileNamePattern: 'service',
      });

      // 첫 번째 날짜
      vi.setSystemTime(new Date('2024-01-15T23:59:00.000Z'));
      transport.log('info', 'message 1');

      // 날짜 변경
      vi.setSystemTime(new Date('2024-01-16T00:01:00.000Z'));
      transport.log('info', 'message 2');

      expect(fsUtils.createWriteStream).toHaveBeenCalledWith('./logs/service-2024-01-15.log', { flags: 'a' });
      expect(fsUtils.createWriteStream).toHaveBeenCalledWith('./logs/service-2024-01-16.log', { flags: 'a' });
    });

    it('오래된 날짜 파일을 정리합니다', () => {
      const mockDate = new Date('2024-01-15T10:00:00.000Z');
      vi.setSystemTime(mockDate);

      vi.mocked(fsUtils.listFilesWithPattern).mockReturnValue([
        'app-2023-12-10.log', // 36일 전
        'app-2024-01-01.log', // 14일 전
        'app-2024-01-14.log', // 1일 전
      ]);

      new FileTransport({
        filePath: './logs',
        rotation: 'date',
        cleanup: { maxDays: 30 },
      });

      expect(fsUtils.deleteFile).toHaveBeenCalledWith('./logs/app-2023-12-10.log');
    });
  });

  describe('하이브리드 롤링', () => {
    it('날짜와 크기 모두 체크합니다', () => {
      const mockDate = new Date('2024-01-15T10:30:00.000Z');
      vi.setSystemTime(mockDate);

      // 현재 파일 크기가 큰 상태로 설정
      vi.mocked(fsUtils.getFileSize).mockReturnValue(9 * 1024 * 1024);

      const transport = new FileTransport({
        filePath: './logs',
        rotation: 'hybrid',
        maxFileSize: 10 * 1024 * 1024,
        cleanup: { maxFiles: 5, maxDays: 30 },
      });

      // 큰 메시지로 크기 초과 트리거
      const largeMessage = 'x'.repeat(2 * 1024 * 1024);
      transport.log('info', largeMessage);

      expect(globalBackgroundQueue.enqueue).toHaveBeenCalled();
    });

    it('날짜 기반 파일도 크기 초과 시 회전합니다', () => {
      const mockDate = new Date('2024-01-15T10:30:00.000Z');
      vi.setSystemTime(mockDate);

      vi.mocked(fsUtils.getFileSize).mockReturnValue(15 * 1024 * 1024);

      const transport = new FileTransport({
        filePath: './logs',
        rotation: 'hybrid',
        maxFileSize: 10 * 1024 * 1024,
      });

      transport.log('info', 'test message');

      expect(globalBackgroundQueue.enqueue).toHaveBeenCalled();
    });
  });

  describe('포맷터', () => {
    it('커스텀 포맷터를 사용합니다', () => {
      const mockDate = new Date('2024-01-15T10:30:00.000Z');
      vi.setSystemTime(mockDate);

      const transport = new FileTransport({
        filePath: './logs/app.log',
        rotation: 'size',
        formatter: new SimpleFormatter(),
      });

      transport.log('warn', 'warning message', { code: 404 }, mockDate);

      const writeCall = mockWriteStream.write.mock.calls[0][0];
      expect(writeCall).toContain('10:30:00 warn ');
      expect(writeCall).toContain('warning message');
    });
  });

  describe('에러 처리', () => {
    it('스트림 쓰기 실패 시 에러를 무시합니다', () => {
      const transport = new FileTransport('./logs/app.log');

      mockWriteStream.write.mockImplementation(() => {
        throw new Error('Write failed');
      });

      expect(() => transport.log('info', 'test')).not.toThrow();
    });

    it('스트림 생성 실패 시 안전하게 처리합니다', () => {
      vi.mocked(fsUtils.createWriteStream).mockImplementation(() => {
        throw new Error('Stream creation failed');
      });

      const transport = new FileTransport({
        filePath: './logs',
        rotation: 'date',
      });

      expect(() => transport.log('info', 'test message')).not.toThrow();
    });

    it('파일 회전 실패 시에도 계속 동작합니다', () => {
      vi.mocked(fsUtils.moveFile).mockImplementation(() => {
        throw new Error('Move failed');
      });

      const transport = new FileTransport('./logs/app.log');
      vi.mocked(fsUtils.getFileSize).mockReturnValue(15 * 1024 * 1024);

      expect(() => transport.log('info', 'test')).not.toThrow();
    });
  });

  describe('정리 기능', () => {
    it('수동 정리를 실행할 수 있습니다', () => {
      const transport = new FileTransport({
        filePath: './logs',
        rotation: 'date',
        cleanup: { maxDays: 7 },
      });

      vi.mocked(fsUtils.listFilesWithPattern).mockReturnValue(['app-2024-01-01.log']);

      transport.manualCleanup();

      expect(fsUtils.listFilesWithPattern).toHaveBeenCalled();
    });

    it('파일 개수 기반 정리를 수행합니다', () => {
      vi.mocked(fsUtils.listFiles).mockReturnValue([
        'app.log.1',
        'app.log.2',
        'app.log.3',
        'app.log.4',
        'app.log.5',
        'app.log.6', // 초과 파일
      ]);

      new FileTransport({
        filePath: './logs/app.log',
        rotation: 'size',
        cleanup: { maxFiles: 5 },
      });

      // 초기화 시 정리가 수행되지 않으므로 수동 호출
      const transport = new FileTransport({
        filePath: './logs/app.log',
        rotation: 'size',
        cleanup: { maxFiles: 5 },
      });
      transport.manualCleanup();

      expect(fsUtils.deleteFile).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('크기 기반 스트림을 닫습니다', () => {
      const transport = new FileTransport('./logs/app.log');
      transport.close();

      expect(mockWriteStream.end).toHaveBeenCalled();
    });

    it('날짜 기반 스트림을 닫습니다', () => {
      const transport = new FileTransport({
        filePath: './logs',
        rotation: 'date',
      });

      // 스트림 생성을 위해 로그 작성
      transport.log('info', 'test');
      transport.close();

      expect(mockWriteStream.end).toHaveBeenCalled();
    });

    it('이미 닫힌 transport를 다시 닫아도 안전합니다', () => {
      const transport = new FileTransport('./logs/app.log');

      transport.close();
      transport.close();

      expect(mockWriteStream.end).toHaveBeenCalledTimes(1);
    });

    it('닫힌 transport는 로그를 무시합니다', () => {
      const transport = new FileTransport('./logs/app.log');

      transport.close();
      transport.log('info', 'should be ignored');

      // close 후에는 추가 write가 호출되지 않아야 함
      expect(mockWriteStream.write).toHaveBeenCalledTimes(0);
    });
  });

  describe('다양한 설정 조합', () => {
    it('모든 옵션을 포함한 하이브리드 설정', () => {
      const options: FileTransportOptions = {
        filePath: './logs',
        fileNamePattern: 'complex-app',
        rotation: 'hybrid',
        maxFileSize: 50 * 1024 * 1024,
        compress: true,
        cleanup: {
          maxFiles: 10,
          maxDays: 90,
        },
        formatter: new JsonFormatter(),
      };

      const transport = new FileTransport(options);

      expect(fsUtils.ensureDirectory).toHaveBeenCalledWith('./logs');

      const mockDate = new Date('2024-01-15T10:30:00.000Z');
      vi.setSystemTime(mockDate);

      transport.log('info', 'complex test', { feature: 'advanced' });

      expect(fsUtils.createWriteStream).toHaveBeenCalledWith('./logs/complex-app-2024-01-15.log', { flags: 'a' });
    });
  });
});
