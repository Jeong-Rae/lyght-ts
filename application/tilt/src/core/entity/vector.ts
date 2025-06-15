/** 2D 위치·속도 벡터 */
export interface Vector2 {
    x: number;
    y: number;
  }
  
  /** 각도 및 각속도 상태 */
  export interface AngularState {
    angle: number; // θ (라디안)
    omega: number; // ω (각속도)
  }
  