import { CANVAS_ID } from '@/config/constants';
import { Game } from '@/app/game';

window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app')!;
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  container.appendChild(canvas);

  // 게임 초기화
  new Game(canvas);
});
