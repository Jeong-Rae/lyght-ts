import { Bar } from '../core/entity/bar';
import { Ball } from '../core/entity/ball';
import { InputHandler } from '../io/inputHandler';
import { CanvasRenderer } from '../io/canvasRenderer';
import { PhysicsService } from '../core/service/physicsService';
import { StatusService } from '../core/service/statusService';
import { GameLoop } from '../core/loop/gameLoop';

export class Game {
  private bar = new Bar();
  private ball = new Ball();
  private input = new InputHandler();
  private renderer: CanvasRenderer;

  /**
   * @param canvas HTMLCanvasElement을 주입받아 렌더러 초기화
   */
  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new CanvasRenderer(canvas);

    // 키 입력에 따라 Bar 상태 조정
    this.input.on((evt) => {
      if (evt === 'tiltLeft') {
        this.bar.tiltLeft(this.input.deltaAngle);
      } else {
        this.bar.tiltRight(this.input.deltaAngle);
      }
    });

    // 게임 루프 시작
    new GameLoop(this.update.bind(this)).start();
  }

  /**
   * 프레임마다 물리 연산·렌더링·상태 판별을 수행합니다.
   * @param dt 전 프레임과의 시간 차(초)
   */
  private update(dt: number) {
    // 물리 업데이트
    PhysicsService.update(dt, this.bar, this.ball);

    // 그리기
    this.renderer.clear();
    this.renderer.drawBar(this.bar);
    this.renderer.drawBall(this.ball);

    // 상태 체크: 낙하 vs 성공
    if (StatusService.hasFallen(this.ball)) {
      console.log('실패: 공 낙하');
    } else if (StatusService.hasReachedTop(this.ball)) {
      console.log('성공: 상단 도달');
    }
  }
}
