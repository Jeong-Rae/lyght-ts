import type { Vector2 } from './vector';

/**
 * Ball 엔티티: 순수 상태만 보유
 * - position: 화면 상 정규화 좌표
 * - velocity: 속도 벡터
 */
export class Ball {
  public position: Vector2 = { x: 0, y: 0 };
  public velocity: Vector2 = { x: 0, y: 0 };
}
