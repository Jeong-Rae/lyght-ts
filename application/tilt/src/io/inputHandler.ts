import {
    KEY_S_LOWER, KEY_S_UPPER,
    KEY_K_LOWER, KEY_K_UPPER,
    BAR_TILT_STEP,
  } from '../config/constants';
  
  export type KeyEvent = 'tiltLeft' | 'tiltRight';
  
  /**
   * KeyboardEvent를 도메인 KeyEvent로 변환합니다.
   * @param e 원본 KeyboardEvent
   * @returns 'tiltLeft' | 'tiltRight' 또는 null
   */
  function detectKeyEvent(e: KeyboardEvent): KeyEvent | null {
    // S 키 -> 왼쪽 기울기
    if (e.key === KEY_S_LOWER || e.key === KEY_S_UPPER) {
      return 'tiltLeft';
    }
    // K 키 -> 오른쪽 기울기
    if (e.key === KEY_K_LOWER || e.key === KEY_K_UPPER) {
      return 'tiltRight';
    }
    return null;
  }
  
  export class InputHandler {
    private listeners: Array<(e: KeyEvent) => void> = [];
  
    constructor() {
      // 문서 전체에 keydown 이벤트 리스너 등록
      document.addEventListener('keydown', e => {
        const event = detectKeyEvent(e);
        if (event) {
          // 등록된 모든 리스너에 이벤트 전달
          this.listeners.forEach(fn => fn(event));
        }
      });
    }
  
    /**
     * KeyEvent 수신기를 등록합니다.
     * @param fn 이벤트 핸들러
     */
    on(fn: (e: KeyEvent) => void) {
      this.listeners.push(fn);
    }
  
    /** Bar에 전달할 각속도 상수 */
    get deltaAngle() {
      return BAR_TILT_STEP;
    }
  }
  