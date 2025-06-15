import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApmTransport, type ApmTransportOptions } from './apm';

// APM 클라이언트 모킹
const mockApmClient = {
  captureException: vi.fn(),
  captureMessage: vi.fn(),
};

describe('ApmTransport', () => {
  let transport: ApmTransport;

  beforeEach(() => {
    vi.clearAllMocks();
    const options: ApmTransportOptions = {
      apmClient: mockApmClient,
    };
    transport = new ApmTransport(options);
  });

  describe('constructor', () => {
    it('기본 captureLevel을 error로 설정합니다', () => {
      const options: ApmTransportOptions = {
        apmClient: mockApmClient,
      };
      const transport = new ApmTransport(options);

      // error 레벨은 캡처되어야 함
      transport.log('error', 'test error');
      expect(mockApmClient.captureMessage).toHaveBeenCalled();

      // warn 레벨은 캡처되지 않아야 함
      vi.clearAllMocks();
      transport.log('warn', 'test warning');
      expect(mockApmClient.captureMessage).not.toHaveBeenCalled();
    });

    it('커스텀 captureLevel을 설정할 수 있습니다', () => {
      const options: ApmTransportOptions = {
        apmClient: mockApmClient,
        captureLevel: 'warn',
      };
      const transport = new ApmTransport(options);

      // warn 레벨도 캡처되어야 함
      transport.log('warn', 'test warning');
      expect(mockApmClient.captureMessage).toHaveBeenCalled();

      // info 레벨은 캡처되지 않아야 함
      vi.clearAllMocks();
      transport.log('info', 'test info');
      expect(mockApmClient.captureMessage).not.toHaveBeenCalled();
    });
  });

  describe('log', () => {
    it('error 레벨 로그를 APM에 전송합니다', () => {
      const testDate = new Date('2024-01-15T12:30:45.123Z');
      transport.log('error', 'test error message', {}, testDate);

      expect(mockApmClient.captureMessage).toHaveBeenCalledWith('test error message', {
        level: 'error',
        timestamp: '2024-01-15T12:30:45.123Z',
      });
    });

    it('Error 객체가 있으면 exception으로 전송합니다', () => {
      const testError = new Error('Test error');
      const testDate = new Date('2024-01-15T12:30:45.123Z');
      const meta = { error: testError, userId: '123' };

      transport.log('error', 'error occurred', meta, testDate);

      expect(mockApmClient.captureException).toHaveBeenCalledWith(testError, {
        error: testError,
        userId: '123',
        level: 'error',
        timestamp: '2024-01-15T12:30:45.123Z',
      });
    });

    it('메타데이터와 함께 로그를 전송합니다', () => {
      const testDate = new Date('2024-01-15T12:30:45.123Z');
      const meta = { userId: '123', action: 'login' };

      transport.log('error', 'login failed', meta, testDate);

      expect(mockApmClient.captureMessage).toHaveBeenCalledWith('login failed', {
        userId: '123',
        action: 'login',
        level: 'error',
        timestamp: '2024-01-15T12:30:45.123Z',
      });
    });

    it('captureLevel 미만의 로그는 무시합니다', () => {
      transport.log('debug', 'debug message');
      transport.log('info', 'info message');
      transport.log('warn', 'warn message');

      expect(mockApmClient.captureMessage).not.toHaveBeenCalled();
      expect(mockApmClient.captureException).not.toHaveBeenCalled();
    });

    it('captureLevel 이상의 로그만 전송합니다', () => {
      const options: ApmTransportOptions = {
        apmClient: mockApmClient,
        captureLevel: 'warn',
      };
      const transport = new ApmTransport(options);

      transport.log('debug', 'debug message');
      transport.log('info', 'info message');
      expect(mockApmClient.captureMessage).not.toHaveBeenCalled();

      transport.log('warn', 'warn message');
      expect(mockApmClient.captureMessage).toHaveBeenCalledTimes(1);

      transport.log('error', 'error message');
      expect(mockApmClient.captureMessage).toHaveBeenCalledTimes(2);
    });

    it('기본 timestamp를 사용할 수 있습니다', () => {
      const mockDate = new Date('2024-01-15T12:30:45.123Z');
      vi.setSystemTime(mockDate);

      transport.log('error', 'test message');

      expect(mockApmClient.captureMessage).toHaveBeenCalledWith('test message', {
        level: 'error',
        timestamp: '2024-01-15T12:30:45.123Z',
      });

      vi.useRealTimers();
    });

    it('빈 메타데이터를 처리합니다', () => {
      const testDate = new Date('2024-01-15T12:30:45.123Z');

      transport.log('error', 'test message', {}, testDate);

      expect(mockApmClient.captureMessage).toHaveBeenCalledWith('test message', {
        level: 'error',
        timestamp: '2024-01-15T12:30:45.123Z',
      });
    });

    it('복잡한 메타데이터를 처리합니다', () => {
      const testDate = new Date('2024-01-15T12:30:45.123Z');
      const complexMeta = {
        user: { id: 123, name: 'John' },
        request: { method: 'POST', url: '/api/login' },
        nested: { deep: { value: true } },
      };

      transport.log('error', 'complex error', complexMeta, testDate);

      expect(mockApmClient.captureMessage).toHaveBeenCalledWith('complex error', {
        user: { id: 123, name: 'John' },
        request: { method: 'POST', url: '/api/login' },
        nested: { deep: { value: true } },
        level: 'error',
        timestamp: '2024-01-15T12:30:45.123Z',
      });
    });
  });
});
