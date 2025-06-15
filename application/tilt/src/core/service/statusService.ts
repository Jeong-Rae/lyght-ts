import { Ball } from '../entity/ball';
import { BAR_HALF_LENGTH, FRAME_HEIGHT } from '../../config/constants';

/**
 * 상태 판별 도메인 서비스
 */
export class StatusService {
  /**
   * Ball이 Bar에서 벗어나 떨어졌는지 판별합니다.
   * @param ball 검사 대상 Ball
   * @returns true이면 낙하 상태
   */
  static hasFallen(ball: Ball): boolean {
    return Math.abs(ball.position.x) > BAR_HALF_LENGTH;
  }

  /**
   * Ball이 프레임 최상단에 도달했는지 판별합니다.
   * @param ball 검사 대상 Ball
   * @returns true이면 최상단 도달 상태
   */
  static hasReachedTop(ball: Ball): boolean {
    return ball.position.y >= FRAME_HEIGHT;
  }
}
