import { MAX_BAR_ANGLE } from '../../config/constants';
import { AngularState } from './vector';

export class Bar {
  public state: AngularState = { angle: 0, omega: 0 };

  /**
   * Bar를 왼쪽(음수 방향)으로 기울입니다.
   * @param delta 각속도 변화량 (rad/s)
   */
  tiltLeft(delta: number) {
    // 음수 방향 회전 입력 설정
    this.state.omega = -delta;
    // 최대 각도 아래로 내려가지 않도록 클램프
    if (this.state.angle + this.state.omega < -MAX_BAR_ANGLE) {
      this.state.angle = -MAX_BAR_ANGLE;
    }
  }

  /**
   * Bar를 오른쪽(양수 방향)으로 기울입니다.
   * @param delta 각속도 변화량 (rad/s)
   */
  tiltRight(delta: number) {
    // 양수 방향 회전 입력 설정
    this.state.omega = +delta;
    // 최대 각도 위로 올라가지 않도록 클램프
    if (this.state.angle + this.state.omega > MAX_BAR_ANGLE) {
      this.state.angle = MAX_BAR_ANGLE;
    }
  }
}
