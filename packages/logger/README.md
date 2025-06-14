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
import { Logger, ConsoleTransport } from '@lyght/logger';

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

## 🔧 Transport 설정

### Console Transport

콘솔에 로그를 출력합니다.

```typescript
import { Logger, ConsoleTransport } from '@lyght/logger';

Logger.useTransports(new ConsoleTransport({
  colors: true // 컬러 출력 활성화 (기본값: true)
}));
```

### 통합 File Transport

파일에 로그를 저장하는 통합 Transport입니다. 크기 기반, 날짜 기반, 또는 복합 롤링을 지원합니다.

#### 🔄 크기 기반 롤링 (기본)

파일 크기가 지정된 크기를 초과하면 새로운 파일로 회전합니다.

```typescript
import { Logger, FileTransport } from '@lyght/logger';

Logger.useTransports(new FileTransport({
  filePath: './logs/app.log',
  rotation: 'size', // 기본값
  maxFileSize: 10 * 1024 * 1024, // 10MB
  compress: true, // gzip 압축 (기본값: true)
  cleanup: {
    maxFiles: 5 // 최대 5개 파일 보관
  }
}));

// 생성되는 파일들:
// app.log (현재)
// app.log.1.gz (이전)
// app.log.2.gz (더 이전)
// ...
```

#### 📅 날짜 기반 롤링

날짜가 바뀔 때마다 새로운 파일을 생성합니다.

```typescript
Logger.useTransports(new FileTransport({
  filePath: './logs', // 디렉토리 경로
  rotation: 'date',
  fileNamePattern: 'app', // 파일명 패턴
  cleanup: {
    maxDays: 30 // 30일 이상 된 파일 삭제
  }
}));

// 생성되는 파일들:
// logs/app-2024-01-15.log
// logs/app-2024-01-16.log
// logs/app-2024-01-17.log
// ...
```

#### 🔄📅 하이브리드 롤링

날짜별로 파일을 생성하되, 파일 크기가 초과하면 해당 날짜 내에서도 회전합니다.

```typescript
Logger.useTransports(new FileTransport({
  filePath: './logs',
  rotation: 'hybrid',
  fileNamePattern: 'service',
  maxFileSize: 50 * 1024 * 1024, // 50MB
  compress: true,
  cleanup: {
    maxFiles: 10, // 각 날짜별 최대 10개 파일
    maxDays: 90   // 90일 이상 된 파일 삭제
  }
}));

// 생성되는 파일들:
// logs/service-2024-01-15.log (현재)
// logs/service-2024-01-15.1.gz (크기 초과로 회전)
// logs/service-2024-01-15.2.gz
// logs/service-2024-01-16.log (날짜 변경)
// ...
```

#### 📋 롤링 모드 비교

| 특징 | `rotation: 'size'` | `rotation: 'date'` | `rotation: 'hybrid'` |
|------|-------------------|-------------------|-------------------|
| **회전 기준** | 파일 크기 | 날짜 변경 (자정) | 크기 + 날짜 |
| **파일명** | `app.log.1` | `app-2024-01-15.log` | `app-2024-01-15.1.log` |
| **압축 지원** | ✅ | ❌ | ✅ |
| **정리 기준** | 파일 개수 | 보관 일수 | 파일 개수 + 보관 일수 |
| **적합한 용도** | 고성능, 디스크 절약 | 일별 분석, 모니터링 | 대용량 + 일별 관리 |

### APM Transport

APM 서비스로 로그를 전송합니다.

```typescript
import { Logger, ApmTransport } from '@lyght/logger';

Logger.useTransports(new ApmTransport({
  endpoint: 'https://apm.example.com/logs',
  apiKey: 'your-api-key',
  serviceName: 'my-service',
  environment: 'production'
}));
```

## 🎨 포맷터 시스템

로그 출력 형식을 커스터마이징할 수 있습니다.

### DefaultFormatter (기본)

```typescript
// 출력: 2024-01-15T10:30:00.000Z [INFO] 사용자 로그인 {"userId":"123"}
Logger.useTransports(new FileTransport({
  filePath: './logs/app.log',
  formatter: new DefaultFormatter()
}));
```

### JsonFormatter

```typescript
import { JsonFormatter } from '@lyght/logger';

// 출력: {"timestamp":"2024-01-15T10:30:00.000Z","level":"info","message":"사용자 로그인","userId":"123"}
Logger.useTransports(new FileTransport({
  filePath: './logs/app.log',
  formatter: new JsonFormatter()
}));
```

### SimpleFormatter

```typescript
import { SimpleFormatter } from '@lyght/logger';

// 출력: 10:30:00 info 사용자 로그인
Logger.useTransports(new FileTransport({
  filePath: './logs/app.log',
  formatter: new SimpleFormatter()
}));
```

### CustomFormatter

```typescript
import { CustomFormatter } from '@lyght/logger';

Logger.useTransports(new FileTransport({
  filePath: './logs/app.log',
  formatter: new CustomFormatter((level, message, meta, timestamp) => {
    return `[${level.toUpperCase()}] ${message} | ${JSON.stringify(meta)}\n`;
  })
}));
```

## 🔧 고급 설정

### 여러 Transport 사용

```typescript
import { Logger, ConsoleTransport, FileTransport, ApmTransport } from '@lyght/logger';

Logger.useTransports(
  // 개발 환경: 콘솔 출력
  new ConsoleTransport({ colors: true }),
  
  // 에러 로그: 크기 기반 파일 저장
  new FileTransport({
    filePath: './logs/error.log',
    rotation: 'size',
    maxFileSize: 5 * 1024 * 1024,
    compress: true,
    cleanup: { maxFiles: 10 }
  }),
  
  // 일반 로그: 날짜 기반 파일 저장
  new FileTransport({
    filePath: './logs',
    rotation: 'date',
    fileNamePattern: 'access',
    cleanup: { maxDays: 30 }
  }),
  
  // 프로덕션: APM 서비스
  new ApmTransport({
    endpoint: 'https://apm.example.com/logs',
    apiKey: process.env.APM_API_KEY!,
    serviceName: 'my-service'
  })
);
```

### 로그 레벨 설정

```typescript
import { Logger, LogLevel } from '@lyght/logger';

// 환경변수로 설정 (LOG_LEVEL=warn)
// 또는 코드로 설정
Logger.setLevel(LogLevel.WARN);

// warn, error만 출력됨
Logger.debug('디버그'); // 출력 안됨
Logger.info('정보');   // 출력 안됨  
Logger.warn('경고');   // 출력됨
Logger.error('에러');  // 출력됨
```

### 실시간 사용 예제

#### 웹 애플리케이션 서버

```typescript
import { Logger, ConsoleTransport, FileTransport } from '@lyght/logger';

// 개발 환경
if (process.env.NODE_ENV === 'development') {
  Logger.useTransports(new ConsoleTransport({ colors: true }));
}

// 프로덕션 환경
if (process.env.NODE_ENV === 'production') {
  Logger.useTransports(
    // 에러 로그: 크기 기반, 압축
    new FileTransport({
      filePath: './logs/error.log',
      rotation: 'size',
      maxFileSize: 10 * 1024 * 1024,
      compress: true,
      cleanup: { maxFiles: 5 }
    }),
    
    // 액세스 로그: 날짜 기반
    new FileTransport({
      filePath: './logs',
      rotation: 'date',
      fileNamePattern: 'access',
      cleanup: { maxDays: 30 }
    })
  );
}

// 사용
Logger.info('서버 시작', { port: 3000 });
Logger.error('데이터베이스 연결 실패', { error: dbError });
```

#### 마이크로서비스 환경

```typescript
// 서비스별 로그 분리
Logger.useTransports(new FileTransport({
  filePath: './logs',
  rotation: 'hybrid',
  fileNamePattern: `${process.env.SERVICE_NAME || 'service'}`,
  maxFileSize: 100 * 1024 * 1024, // 100MB
  compress: true,
  cleanup: {
    maxFiles: 20,
    maxDays: 60
  }
}));
```

## 📊 성능 최적화

- **백그라운드 처리**: 파일 회전과 압축은 백그라운드에서 처리되어 로깅 성능에 영향을 주지 않습니다.
- **스트림 재사용**: 동일한 파일에 대해 스트림을 재사용하여 I/O 오버헤드를 최소화합니다.
- **압축**: gzip 압축으로 디스크 사용량을 크게 줄일 수 있습니다.
- **자동 정리**: 오래된 파일을 자동으로 삭제하여 디스크 공간을 관리합니다.

## 🔒 에러 처리

모든 Transport는 안전한 에러 처리를 제공합니다:

- 파일 쓰기 실패 시 로그 손실 없이 계속 동작
- 네트워크 오류 시 APM 전송 실패를 무시
- 파일 회전 실패 시에도 로깅 계속 진행

## 📝 마이그레이션 가이드

### DailyFileTransport에서 FileTransport로

```typescript
// 기존 (deprecated)
new DailyFileTransport({
  logDirectory: './logs',
  fileNamePattern: 'app',
  maxDays: 30
})

// 새로운 방식 (권장)
new FileTransport({
  filePath: './logs',
  rotation: 'date',
  fileNamePattern: 'app',
  cleanup: { maxDays: 30 }
})
```

## �� 라이선스

MIT License

## 🤝 기여

이 프로젝트에 기여하고 싶으시다면:

1. Fork 하기
2. Feature 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 Push (`git push origin feature/amazing-feature`)
5. Pull Request 열기

## ⚠️ 주의사항

### 파일 로깅 시 디렉토리 자동 생성

FileTransport와 DailyFileTransport는 로그 파일 경로의 디렉토리가 없으면 자동으로 생성합니다. 별도의 디렉토리 생성이 불필요합니다.

```typescript
// 디렉토리가 없어도 자동 생성됨
Logger.useTransports(new FileTransport('./logs/nested/deep/app.log'));
Logger.useTransports(new DailyFileTransport({ logDirectory: './logs/daily' }));
```

### 환경변수 설정

로그 레벨을 설정하려면 애플리케이션 시작 전에 환경변수를 설정하세요:

```bash
# Linux/Mac
export LOG_LEVEL=warn

# Windows (PowerShell)
$env:LOG_LEVEL = "warn"
```

### Transport 에러 처리

Transport에서 에러가 발생해도 다른 Transport는 계속 동작합니다. 이는 로깅 시스템의 안정성을 보장합니다.

```typescript
// 하나의 Transport가 실패해도 다른 Transport는 계속 동작
Logger.useTransports(
  new ConsoleTransport(),
  new FileTransport('./logs/app.log'),  // 파일 쓰기 실패 가능
  new ApmTransport({ apmClient })       // 네트워크 오류 가능
);
```

## 📞 지원

문제가 있거나 질문이 있으시면 이슈를 생성해주세요. 