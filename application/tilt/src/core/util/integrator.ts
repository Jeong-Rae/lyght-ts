/**
 * 주어진 값을 미분값으로 적분합니다.
 * @param value 현재 값
 * @param derivative 미분값
 * @param dt 시간 간격
 * @returns 적분 결과
 */
export function integrate(value: number, derivative: number, dt: number): number {
  return value + derivative * dt;
}
