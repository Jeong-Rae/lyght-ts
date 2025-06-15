import {
  FRAME_WIDTH,
  CANVAS_PIXEL_WIDTH,
  CANVAS_PIXEL_HEIGHT,
  BAR_HALF_LENGTH,
  BAR_LINE_WIDTH,
  BAR_COLOR,
  BALL_RADIUS_PX,
  BALL_COLOR,
} from '../config/constants';
import { Bar } from '../core/entity/bar';
import { Ball } from '../core/entity/ball';

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;

  /**
   * @param canvas HTMLCanvasElement (크기는 constants에서 설정)
   */
  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D 컨텍스트 없음');
    this.ctx = ctx;

    // 상수에 정의된 픽셀 크기 적용
    canvas.width = CANVAS_PIXEL_WIDTH;
    canvas.height = CANVAS_PIXEL_HEIGHT;
  }

  /** 캔버스를 초기화(지우기) 합니다. */
  clear() {
    this.ctx.clearRect(0, 0, CANVAS_PIXEL_WIDTH, CANVAS_PIXEL_HEIGHT);
  }

  /**
   * Bar를 그립니다.
   * @param bar Bar 엔티티
   */
  drawBar(bar: Bar) {
    const cx = CANVAS_PIXEL_WIDTH / 2;
    const cy = CANVAS_PIXEL_HEIGHT;
    // 절반 길이를 프레임 비율 -> 픽셀로 환산
    const halfPx = (CANVAS_PIXEL_WIDTH * BAR_HALF_LENGTH) / FRAME_WIDTH;
    // 기울기에 따른 끝점 오프셋
    const dx = halfPx * Math.cos(bar.state.angle);
    const dy = halfPx * Math.sin(bar.state.angle);

    this.ctx.beginPath();
    this.ctx.moveTo(cx - dx, cy + dy);
    this.ctx.lineTo(cx + dx, cy - dy);
    this.ctx.lineWidth = BAR_LINE_WIDTH;
    this.ctx.strokeStyle = BAR_COLOR;
    this.ctx.stroke();
  }

  /**
   * Ball을 그립니다.
   * @param ball Ball 엔티티
   */
  drawBall(ball: Ball) {
    const cx = CANVAS_PIXEL_WIDTH / 2;
    // 정규화된 x를 픽셀 좌표로 변환
    const bx = cx + (ball.position.x * CANVAS_PIXEL_WIDTH) / FRAME_WIDTH;
    // 항상 Bar 위에 위치
    const by = CANVAS_PIXEL_HEIGHT - BALL_RADIUS_PX - BAR_LINE_WIDTH;

    this.ctx.beginPath();
    this.ctx.arc(bx, by, BALL_RADIUS_PX, 0, 2 * Math.PI);
    this.ctx.fillStyle = BALL_COLOR;
    this.ctx.fill();
  }
}
