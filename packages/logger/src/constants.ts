// 파일 크기 관련 상수
export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const DEFAULT_MAX_FILES = 5;
export const DEFAULT_MAX_DAYS = 30;

// 파일 스트림 플래그
export const FILE_APPEND_FLAG = 'a';

// 더미 데이터 문자
export const DUMMY_DATA_CHAR = 'a';

// 파일 확장자
export const LOG_FILE_EXTENSION = '.log';
export const GZIP_FILE_EXTENSION = '.gz';

// 날짜 포맷
export const DATE_FORMAT_REGEX = /(\d{4}-\d{2}-\d{2})/;
export const FILE_NUMBER_REGEX = /\.(\d+)(\.gz)?$/;

// 로그 레벨 패딩 길이
export const LOG_LEVEL_PADDING = 5;

// 로그 레벨 우선순위 (숫자가 높을수록 중요한 레벨)
export const LOG_LEVEL_PRIORITY = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
} as const;

// 백그라운드 작업 큐 설정
export const BACKGROUND_QUEUE_DELAY = 0; // 즉시 처리
export const MAX_QUEUE_SIZE = 1000; // 최대 큐 크기
