import { K } from '@/config/constants';

export type TickCallback = (dt: number) => void;

/**
 * 프레임별 dt 계산 책임
 */
export class GameLoop {
  private last = 0;

  /**
   * @param cb 각 프레임마다 호출할 콜백 (dt: 초)
   */
  constructor(private cb: TickCallback) {}

  /** 게임 루프를 시작합니다. */
  start() {
    this.last = performance.now();
    requestAnimationFrame(this.tick.bind(this));
  }

  /** 내부 동작: ANIMATION_FRAME마다 dt 계산 후 콜백 호출 */
  private tick(now: number) {
    const dt = (now - this.last) / K; // ms → s
    this.last = now;
    this.cb(dt);
    requestAnimationFrame(this.tick.bind(this));
  }
}
