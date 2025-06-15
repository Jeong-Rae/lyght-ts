import fs from 'node:fs';
import path from 'node:path';
import { createGzip } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  compressFile,
  copyFile,
  createDirectory,
  createReadStream,
  createWriteStream,
  deleteFile,
  deleteFiles,
  ensureDirectory,
  ensureFileDirectory,
  exists,
  getBaseName,
  getDirectory,
  getExtension,
  getFileInfo,
  getFileSize,
  joinPath,
  listFiles,
  listFilesWithPattern,
  moveFile,
  normalizePath,
} from './fs';

// fs 모듈 모킹
vi.mock('fs');
vi.mock('zlib');

describe('FileSystem Utils', () => {
  // biome-ignore lint/suspicious/noExplicitAny: test code
  let mockWriteStream: any;
  // biome-ignore lint/suspicious/noExplicitAny: test code
  let mockReadStream: any;
  // biome-ignore lint/suspicious/noExplicitAny: test code
  let mockGzip: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockWriteStream = {
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn().mockReturnThis(),
      pipe: vi.fn().mockReturnThis(),
    };

    mockReadStream = {
      pipe: vi.fn().mockReturnThis(),
      on: vi.fn(),
    };

    mockGzip = {
      pipe: vi.fn().mockReturnThis(),
      on: vi.fn(),
    };

    // biome-ignore lint/suspicious/noExplicitAny: test code
    vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream as any);
    // biome-ignore lint/suspicious/noExplicitAny: test code
    vi.mocked(fs.createReadStream).mockReturnValue(mockReadStream as any);
    // biome-ignore lint/suspicious/noExplicitAny: test code
    vi.mocked(createGzip).mockReturnValue(mockGzip as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('exists', () => {
    it('파일이 존재할 때 true를 반환합니다', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      expect(exists('/test/file.txt')).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith('/test/file.txt');
    });

    it('파일이 존재하지 않을 때 false를 반환합니다', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(exists('/test/nonexistent.txt')).toBe(false);
    });

    it('에러가 발생할 때 false를 반환합니다', () => {
      vi.mocked(fs.existsSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(exists('/test/file.txt')).toBe(false);
    });
  });

  describe('getFileInfo', () => {
    it('존재하는 파일의 정보를 반환합니다', () => {
      const mockStats = {
        size: 1024,
        isDirectory: (): boolean => false,
        isFile: (): boolean => true,
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-02'),
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      // biome-ignore lint/suspicious/noExplicitAny: test code
      vi.mocked(fs.statSync).mockReturnValue(mockStats as any);

      const info = getFileInfo('/test/file.txt');

      expect(info).toEqual({
        path: '/test/file.txt',
        size: 1024,
        exists: true,
        isDirectory: false,
        isFile: true,
        createdAt: new Date('2024-01-01'),
        modifiedAt: new Date('2024-01-02'),
      });
    });

    it('존재하지 않는 파일에 대해 기본 정보를 반환합니다', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const info = getFileInfo('/test/nonexistent.txt');

      expect(info).toEqual({
        path: '/test/nonexistent.txt',
        size: 0,
        exists: false,
        isDirectory: false,
        isFile: false,
      });
    });

    it('stat 에러 시 기본 정보를 반환합니다', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const info = getFileInfo('/test/file.txt');

      expect(info.exists).toBe(false);
    });
  });

  describe('getFileSize', () => {
    it('파일 크기를 반환합니다', () => {
      const mockStats = {
        size: 2048,
        isDirectory: (): boolean => false,
        isFile: (): boolean => true,
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      // biome-ignore lint/suspicious/noExplicitAny: test code
      vi.mocked(fs.statSync).mockReturnValue(mockStats as any);

      expect(getFileSize('/test/file.txt')).toBe(2048);
    });
  });

  describe('createDirectory', () => {
    it('디렉토리를 생성합니다', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);

      const result = createDirectory('/test/dir');

      expect(result).toBe(true);
      expect(fs.mkdirSync).toHaveBeenCalledWith('/test/dir', {
        recursive: true,
      });
    });

    it('이미 존재하는 디렉토리는 생성하지 않습니다', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = createDirectory('/test/existing');

      expect(result).toBe(true);
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('생성 실패 시 false를 반환합니다', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = createDirectory('/test/dir');

      expect(result).toBe(false);
    });
  });

  describe('ensureDirectory', () => {
    it('디렉토리가 존재하지 않으면 생성합니다', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);

      const result = ensureDirectory('/test/dir');

      expect(result).toBe(true);
      expect(fs.mkdirSync).toHaveBeenCalled();
    });

    it('디렉토리가 이미 존재하면 생성하지 않습니다', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = ensureDirectory('/test/existing');

      expect(result).toBe(true);
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('ensureFileDirectory', () => {
    it('파일의 디렉토리를 생성합니다', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);

      const result = ensureFileDirectory('/test/dir/file.txt');

      expect(result).toBe(true);
      expect(fs.mkdirSync).toHaveBeenCalledWith('/test/dir', {
        recursive: true,
      });
    });
  });

  describe('createWriteStream', () => {
    it('쓰기 스트림을 생성합니다', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const stream = createWriteStream('/test/file.txt');

      expect(stream).toBe(mockWriteStream);
      expect(fs.createWriteStream).toHaveBeenCalledWith('/test/file.txt', {
        flags: 'a',
      });
    });

    it('디렉토리를 자동으로 생성합니다', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);

      createWriteStream('/test/dir/file.txt');

      expect(fs.mkdirSync).toHaveBeenCalledWith('/test/dir', {
        recursive: true,
      });
    });
  });

  describe('createReadStream', () => {
    it('읽기 스트림을 생성합니다', () => {
      const stream = createReadStream('/test/file.txt');

      expect(stream).toBe(mockReadStream);
      expect(fs.createReadStream).toHaveBeenCalledWith('/test/file.txt', {});
    });
  });

  describe('listFiles', () => {
    it('디렉토리의 파일 목록을 반환합니다', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      // biome-ignore lint/suspicious/noExplicitAny: test code
      vi.mocked(fs.readdirSync).mockReturnValue(['file1.txt', 'file2.log'] as any);

      const files = listFiles('/test/dir');

      expect(files).toEqual(['file1.txt', 'file2.log']);
    });

    it('존재하지 않는 디렉토리는 빈 배열을 반환합니다', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const files = listFiles('/test/nonexistent');

      expect(files).toEqual([]);
    });

    it('에러 시 빈 배열을 반환합니다', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const files = listFiles('/test/dir');

      expect(files).toEqual([]);
    });
  });

  describe('listFilesWithPattern', () => {
    it('패턴에 맞는 파일들을 필터링합니다', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      // biome-ignore lint/suspicious/noExplicitAny: test code
      vi.mocked(fs.readdirSync).mockReturnValue(['app.log', 'error.log', 'config.json', 'data.txt'] as any);

      const logFiles = listFilesWithPattern('/test/dir', /\.log$/);

      expect(logFiles).toEqual(['app.log', 'error.log']);
    });
  });

  describe('deleteFile', () => {
    it('파일을 삭제합니다', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.unlinkSync).mockReturnValue(undefined);

      const result = deleteFile('/test/file.txt');

      expect(result).toBe(true);
      expect(fs.unlinkSync).toHaveBeenCalledWith('/test/file.txt');
    });

    it('존재하지 않는 파일은 true를 반환합니다', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = deleteFile('/test/nonexistent.txt');

      expect(result).toBe(true);
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('삭제 실패 시 false를 반환합니다', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.unlinkSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = deleteFile('/test/file.txt');

      expect(result).toBe(false);
    });
  });

  describe('moveFile', () => {
    it('파일을 이동합니다', () => {
      vi.mocked(fs.existsSync).mockReturnValueOnce(true).mockReturnValueOnce(true);
      vi.mocked(fs.renameSync).mockReturnValue(undefined);

      const result = moveFile('/test/old.txt', '/test/new.txt');

      expect(result).toBe(true);
      expect(fs.renameSync).toHaveBeenCalledWith('/test/old.txt', '/test/new.txt');
    });

    it('존재하지 않는 파일은 false를 반환합니다', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = moveFile('/test/nonexistent.txt', '/test/new.txt');

      expect(result).toBe(false);
      expect(fs.renameSync).not.toHaveBeenCalled();
    });

    it('이동 실패 시 false를 반환합니다', () => {
      vi.mocked(fs.existsSync).mockReturnValueOnce(true).mockReturnValueOnce(true);
      vi.mocked(fs.renameSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = moveFile('/test/old.txt', '/test/new.txt');

      expect(result).toBe(false);
    });
  });

  describe('copyFile', () => {
    it('파일을 복사합니다', () => {
      vi.mocked(fs.existsSync).mockReturnValueOnce(true).mockReturnValueOnce(true);
      vi.mocked(fs.copyFileSync).mockReturnValue(undefined);

      const result = copyFile('/test/source.txt', '/test/dest.txt');

      expect(result).toBe(true);
      expect(fs.copyFileSync).toHaveBeenCalledWith('/test/source.txt', '/test/dest.txt');
    });

    it('존재하지 않는 원본 파일은 false를 반환합니다', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = copyFile('/test/nonexistent.txt', '/test/dest.txt');

      expect(result).toBe(false);
      expect(fs.copyFileSync).not.toHaveBeenCalled();
    });

    it('복사 실패 시 false를 반환합니다', () => {
      vi.mocked(fs.existsSync).mockReturnValueOnce(true).mockReturnValueOnce(true);
      vi.mocked(fs.copyFileSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = copyFile('/test/source.txt', '/test/dest.txt');

      expect(result).toBe(false);
    });
  });

  describe('deleteFiles', () => {
    it('여러 파일을 삭제하고 결과를 반환합니다', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.unlinkSync)
        .mockReturnValueOnce(undefined)
        .mockImplementationOnce(() => {
          throw new Error('Permission denied');
        });

      const result = deleteFiles(['/test/file1.txt', '/test/file2.txt']);

      expect(result).toEqual({
        success: ['/test/file1.txt'],
        failed: ['/test/file2.txt'],
      });
    });
  });

  describe('path utilities', () => {
    it('경로를 정규화합니다', () => {
      const normalized = normalizePath('/test//dir/../file.txt');
      expect(normalized).toBe(path.normalize('/test//dir/../file.txt'));
    });

    it('경로를 결합합니다', () => {
      const joined = joinPath('/test', 'dir', 'file.txt');
      expect(joined).toBe(path.join('/test', 'dir', 'file.txt'));
    });

    it('확장자를 가져옵니다', () => {
      expect(getExtension('/test/file.txt')).toBe('.txt');
      expect(getExtension('/test/file')).toBe('');
    });

    it('파일명을 가져옵니다', () => {
      expect(getBaseName('/test/file.txt')).toBe('file');
      expect(getBaseName('/test/file')).toBe('file');
    });

    it('디렉토리를 가져옵니다', () => {
      expect(getDirectory('/test/dir/file.txt')).toBe(path.dirname('/test/dir/file.txt'));
    });
  });

  describe('compressFile', () => {
    it('파일을 압축합니다', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // 스트림 체인 모킹
      mockReadStream.pipe.mockReturnValue(mockGzip);
      mockGzip.pipe.mockReturnValue(mockWriteStream);

      // finish 이벤트 시뮬레이션
      mockWriteStream.on.mockImplementation((event: string, callback: () => void) => {
        if (event === 'finish') {
          setTimeout(callback, 0);
        }
        return mockWriteStream;
      });

      const result = await compressFile('/test/file.txt');

      expect(result).toBe(true);
      expect(createGzip).toHaveBeenCalled();
    });

    it('존재하지 않는 파일은 false를 반환합니다', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await compressFile('/test/nonexistent.txt');

      expect(result).toBe(false);
    });

    it('압축 후 원본 파일을 삭제할 수 있습니다', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.unlinkSync).mockReturnValue(undefined);

      // 스트림 체인 모킹
      mockReadStream.pipe.mockReturnValue(mockGzip);
      mockGzip.pipe.mockReturnValue(mockWriteStream);

      mockWriteStream.on.mockImplementation((event: string, callback: () => void) => {
        if (event === 'finish') {
          setTimeout(callback, 0);
        }
        return mockWriteStream;
      });

      const result = await compressFile('/test/file.txt', {
        deleteOriginal: true,
      });

      expect(result).toBe(true);
    });

    it('압축 중 에러 발생 시 false를 반환합니다', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // 스트림 체인 모킹
      mockReadStream.pipe.mockReturnValue(mockGzip);
      mockGzip.pipe.mockReturnValue(mockWriteStream);

      // error 이벤트 시뮬레이션
      mockWriteStream.on.mockImplementation((event: string, callback: () => void) => {
        if (event === 'error') {
          setTimeout(callback, 0);
        }
        return mockWriteStream;
      });

      const result = await compressFile('/test/file.txt');

      expect(result).toBe(false);
    });

    it('압축 함수 실행 중 예외 발생 시 false를 반환합니다', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(createGzip).mockImplementation(() => {
        throw new Error('Compression error');
      });

      const result = await compressFile('/test/file.txt');

      expect(result).toBe(false);
    });
  });

  describe('함수들', () => {
    it('모든 함수가 정상적으로 export됩니다', () => {
      expect(typeof exists).toBe('function');
      expect(typeof getFileInfo).toBe('function');
      expect(typeof createDirectory).toBe('function');
    });
  });
});
