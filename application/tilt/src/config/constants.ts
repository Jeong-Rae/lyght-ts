// 화면 비율
export const FRAME_WIDTH = 20 as const;
export const FRAME_HEIGHT = 9 as const;

// 막대기
export const MAX_BAR_ANGLE = Math.PI / 6;   // ±30°
export const BAR_TILT_STEP = 0.02 as const;           // 회전 속도

// 물리 상수
export const GRAVITY = 9.81 as const; // 중력 가속도 (m/s²)
export const RADIUS = 1 as const;     // 공 반지름 가정 (단위 길이)

// 엔티티 길이
export const BAR_HALF_LENGTH = 0.5 as const; // 정규화된 막대기 절반 길이

// 키 이벤트
export const KEY_S_LOWER = 's' as const;
export const KEY_S_UPPER = 'S' as const;
export const KEY_K_LOWER = 'k' as const;
export const KEY_K_UPPER = 'K' as const;

// Canvas 렌더링 설정
export const CANVAS_ID = 'gameCanvas' as const;
export const CANVAS_PIXEL_WIDTH = 800 as const;  // 20:9 비율 → 높이 360
export const CANVAS_PIXEL_HEIGHT = 360 as const;
export const BAR_LINE_WIDTH = 5 as const;        // 막대기 두께(px)
export const BALL_RADIUS_PX = 10 as const;       // 공 반지름(px)
export const BAR_COLOR = '#333D4B' as const;     // BEM 규칙 폰트 색상과 동일
export const BALL_COLOR = '#ff0000' as const;    // 공 색상
