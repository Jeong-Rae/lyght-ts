import { BACKGROUND_QUEUE_DELAY, MAX_QUEUE_SIZE } from "../constants";

export type BackgroundTask = () => Promise<void>;

export class BackgroundQueue {
	private queue: BackgroundTask[] = [];
	private processing = false;

	/**
	 * 백그라운드 작업을 큐에 추가합니다.
	 * @param {BackgroundTask} task - 백그라운드 작업 함수
	 * 
	 * @example
	 * ```typescript
	 * const queue = new BackgroundQueue();
	 * queue.enqueue(async () => fn());
	 * ```
	 */
	enqueue(task: BackgroundTask): void {
		if (this.queue.length >= MAX_QUEUE_SIZE) {
			// 큐가 가득 찬 경우 가장 오래된 작업 제거
			this.queue.shift();
		}

		this.queue.push(task);
		this.processQueue();
	}

	/**
	 * 큐에 있는 작업들을 순차적으로 처리합니다.
	 * @returns {Promise<void>} 큐 처리 완료 시 Promise
	 */
	private async processQueue(): Promise<void> {
		if (this.processing || this.queue.length === 0) {
			return;
		}

		this.processing = true;

		while (this.queue.length > 0) {
			const task = this.queue.shift();
			if (task) {
				try {
					await task();
				} catch (error) {
					// 백그라운드 작업 실패는 로깅하지 않음 (무한 루프 방지)
					console.error("Background task failed:", error);
				}
			}

			// 다음 작업 전 잠시 대기 (CPU 부하 방지)
			if (BACKGROUND_QUEUE_DELAY > 0) {
				await new Promise((resolve) =>
					setTimeout(resolve, BACKGROUND_QUEUE_DELAY),
				);
			}
		}

		this.processing = false;
	}

	/**
	 * 현재 큐에 있는 작업 수를 반환합니다.
	 * @returns {number} 큐에 있는 작업 수
	 */
	get size(): number {
		return this.queue.length;
	}

	/**
	 * 큐가 현재 작업을 처리 중인지 확인합니다.
	 * @returns {boolean} 큐가 현재 작업을 처리 중이면 true, 아니면 false
	 */
	get isProcessing(): boolean {
		return this.processing;
	}

	/**
	 * 모든 작업이 완료될 때까지 대기합니다.
	 * @returns {Promise<void>} 모든 작업이 완료될 때까지 대기
	 */
	async waitForCompletion(): Promise<void> {
		while (this.processing || this.queue.length > 0) {
			await new Promise((resolve) => setTimeout(resolve, 10));
		}
	}
}

// 전역 백그라운드 큐 인스턴스
export const globalBackgroundQueue = new BackgroundQueue();
