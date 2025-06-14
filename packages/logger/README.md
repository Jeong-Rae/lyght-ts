# Logger

확장 가능하고 유연한 TypeScript 로깅 라이브러리입니다. 다양한 transport를 지원하여 콘솔, 파일, APM 서비스 등으로 로그를 출력할 수 있습니다.

## 📦 설치

```bash
npm install @lyght/logger
# 또는
pnpm add @lyght/logger
# 또는
yarn add @lyght/logger
```

## 🚀 기본 사용법

### 단순한 콘솔 로깅

```typescript
import { Logger, ConsoleTransport } from 'logger';

// Transport 설정
Logger.useTransports(new ConsoleTransport());

// 로그 출력
Logger.debug('디버그 메시지');
Logger.info('정보 메시지');
Logger.warn('경고 메시지');
Logger.error('에러 메시지');
```

### 메타데이터와 함께 로깅

```typescript
Logger.info('사용자 로그인', { 
  userId: '12345', 
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
});

Logger.error('데이터베이스 연결 실패', {
  database: 'main',
  host: 'localhost',
  port: 5432
});
```

### Error 객체 로깅

```typescript
try {
  // 에러가 발생할 수 있는 코드
  throw new Error('Something went wrong');
} catch (error) {
  Logger.error(error, { context: 'user-service' });
}
```

## 🎯 Transport 시스템

### Console Transport

콘솔에 로그를 출력합니다.

```typescript
import { Logger, ConsoleTransport } from 'logger';

Logger.useTransports(new ConsoleTransport());
```

### File Transport

파일에 로그를 저장합니다. 파일 롤링, 압축, 자동 디렉토리 생성을 지원합니다.

#### 기본 사용법

```typescript
import { Logger, FileTransport } from '@lyght/logger';

// 간단한 파일 로깅
Logger.useTransports(new FileTransport('./logs/app.log'));
```

#### 고급 옵션

```typescript
import { Logger, FileTransport } from '@lyght/logger';

Logger.useTransports(new FileTransport({
  filePath: './logs/app.log',
  maxFileSize: 10 * 1024 * 1024,  // 10MB (기본값)
  maxFiles: 5,                     // 최대 5개 파일 보관 (기본값)
  compress: true                   // 회전된 파일 압축 (기본값: true)
}));
```

#### 주요 기능

- **자동 롤링**: 파일 크기가 `maxFileSize`를 초과하면 자동으로 새 파일로 회전
- **파일 압축**: 회전된 파일을 gzip으로 압축하여 디스크 공간 절약
- **자동 정리**: `maxFiles` 수를 초과하는 오래된 파일 자동 삭제
- **디렉토리 생성**: 로그 파일 경로의 디렉토리가 없으면 자동 생성

### APM Transport

APM 서비스(예: Elastic APM, Sentry)에 로그를 전송합니다.

```typescript
import { Logger, ApmTransport } from 'logger';
import apm from 'elastic-apm-node';

Logger.useTransports(new ApmTransport(apm));
```

### 여러 Transport 조합 사용

```typescript
import { Logger, ConsoleTransport, FileTransport, ApmTransport } from 'logger';

Logger.useTransports(
  new ConsoleTransport(),
  new FileTransport('./logs/app.log'),
  new ApmTransport(apmClient)
);

// 모든 transport에 동시에 로그가 출력됩니다
Logger.info('애플리케이션 시작됨');
```

## 📊 로그 레벨

로그 레벨은 환경변수 `LOG_LEVEL`로 설정할 수 있습니다.

```bash
export LOG_LEVEL=warn
```

### 지원하는 로그 레벨

1. **debug** - 디버깅 정보 (기본값)
2. **info** - 일반 정보
3. **warn** - 경고
4. **error** - 에러

설정된 레벨보다 높은 우선순위의 로그만 출력됩니다.

```typescript
// LOG_LEVEL=warn인 경우
Logger.debug('출력되지 않음'); 
Logger.info('출력되지 않음');  
Logger.warn('출력됨');         
Logger.error('출력됨');        
```

## 🛠️ 고급 사용법

### 커스텀 Transport 만들기

```typescript
import { Transport, LogLevel, Meta } from 'logger';

class DatabaseTransport implements Transport {
  log(level: LogLevel, message: string, meta: Meta = {}): void {
    // 데이터베이스에 로그 저장 로직
    db.table.save(message);
  }
}

Logger.useTransports(new DatabaseTransport());
```

### 조건부 로깅

```typescript
import { Logger } from 'logger';

// 개발 환경에서만 디버그 로그 출력
if (process.env.NODE_ENV === 'development') {
  Logger.debug('개발 환경 디버그 정보');
}

// 에러 레벨에서만 슬랙 알림
Logger.error('심각한 에러 발생', { 
  notify: 'slack',
  channel: '#alerts' 
});
```

## 📝 API 레퍼런스

### Logger 클래스

#### 정적 메서드

- `Logger.useTransports(...transports: Transport[])` - Transport 설정
- `await Logger.debug(message: string, meta?: Meta)` - 디버그 로그
- `await Logger.info(message: string, meta?: Meta)` - 정보 로그  
- `await Logger.warn(message: string, meta?: Meta)` - 경고 로그
- `await Logger.error(errOrMsg: string | Error, meta?: Meta)` - 에러 로그

### Transport 인터페이스

```typescript
interface Transport {
  log(level: LogLevel, message: string, meta?: Meta): void | Promise<void>;
}
```

### 타입 정의

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type Meta = Record<string, unknown>;

interface FileTransportOptions {
  filePath: string;
  maxFileSize?: number;  // bytes, 기본값: 10MB
  maxFiles?: number;     // 기본값: 5
  compress?: boolean;    // 기본값: true
}
```

## 🌍 환경변수

| 변수명 | 설명 | 기본값 | 예시 |
|--------|------|--------|------|
| `LOG_LEVEL` | 최소 로그 레벨 | `debug` | `warn`, `error` |

## 🧪 테스트

```bash
# 테스트 실행
pnpm test

# 커버리지 포함 테스트
pnpm test --coverage

# 타입 체크
pnpm typecheck
```

## 📄 라이선스

ISC

## 🤝 기여

이 프로젝트에 기여하고 싶으시다면:

1. Fork 하기
2. Feature 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 Push (`git push origin feature/amazing-feature`)
5. Pull Request 열기

## ⚠️ 주의사항

### 파일 로깅 시 디렉토리 자동 생성

FileTransport는 로그 파일 경로의 디렉토리가 없으면 자동으로 생성합니다. 별도의 디렉토리 생성이 불필요합니다.

```typescript
// 디렉토리가 없어도 자동 생성됨
Logger.useTransports(new FileTransport('./logs/nested/deep/app.log'));
```

### 환경변수 설정

로그 레벨을 설정하려면 애플리케이션 시작 전에 환경변수를 설정하세요:

```bash
# Linux/Mac
export LOG_LEVEL=warn

# Windows (PowerShell)
$env:LOG_LEVEL = "warn"
```

## 📞 지원

문제가 있거나 질문이 있으시면 이슈를 생성해주세요. 