import { Bar } from '../entity/bar';
import { Ball } from '../entity/ball';
import { GRAVITY, RADIUS } from '../../config/constants';
import { integrate } from '../util/integrator';

export class PhysicsService {
  /**
   * 주어진 각도에서의 각가속도를 계산합니다.
   * α = (g / r) * sin(θ)
   * @param angle 현재 Bar의 기울기(라디안)
   * @returns 계산된 각가속도 (rad/s^2)
   */
  static computeAngularAcceleration(angle: number): number {
    // 중력에 비례하고, 반지름으로 나눠지는 비율
    return (GRAVITY / RADIUS) * Math.sin(angle);
  }

  /**
   * 한 프레임(dt) 동안 Bar와 Ball 상태를 업데이트합니다.
   * - Bar: 입력된 ω로 각도 갱신
   * - Ball: Euler 적분으로 가속도/속도/위치 갱신
   * @param dt 프레임 간격(초)
   * @param bar Bar 엔티티
   * @param ball Ball 엔티티
   */
  static update(dt: number, bar: Bar, ball: Ball) {
    // Bar 각도 통합: θ <- θ + ω * dt
    bar.state.angle += bar.state.omega * dt;

    // Ball 가속도 계산
    const alpha = this.computeAngularAcceleration(bar.state.angle);
    // Ball 속도 통합: vx <- vx + α * dt
    ball.velocity.x = integrate(ball.velocity.x, alpha, dt);

    // Ball 위치 통합: x <- x + vx * dt
    ball.position.x = integrate(ball.position.x, ball.velocity.x, dt);

    // y 위치는 Bar 위에 고정 (모델에 따라 달라짐)
    ball.position.y = 0;
  }
}
