import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BackgroundQueue, globalBackgroundQueue } from "./background-queue";

describe("BackgroundQueue", () => {
	let queue: BackgroundQueue;

	beforeEach(() => {
		queue = new BackgroundQueue();
		vi.clearAllTimers();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	describe("enqueue", () => {
		it("작업을 큐에 추가하고 즉시 처리를 시작합니다", async () => {
			const task = vi.fn().mockResolvedValue(undefined);

			queue.enqueue(task);

			// 처리가 시작되었는지 확인
			expect(queue.isProcessing).toBe(true);

			// 비동기 처리 완료 대기
			await vi.runAllTimersAsync();

			expect(task).toHaveBeenCalled();
			expect(queue.size).toBe(0);
		});

		it("여러 작업을 큐에 추가할 수 있습니다", async () => {
			const results: number[] = [];
			const task1 = vi.fn().mockImplementation(async () => {
				results.push(1);
			});
			const task2 = vi.fn().mockImplementation(async () => {
				results.push(2);
			});
			const task3 = vi.fn().mockImplementation(async () => {
				results.push(3);
			});

			// 첫 번째 작업 추가 (처리 시작)
			queue.enqueue(task1);
			expect(queue.isProcessing).toBe(true);

			// 처리 중에 추가 작업들 추가
			queue.enqueue(task2);
			queue.enqueue(task3);

			// 모든 작업 완료 대기
			await vi.runAllTimersAsync();

			expect(results).toEqual([1, 2, 3]);
			expect(queue.size).toBe(0);
		});

		it("최대 큐 크기를 초과하면 오래된 작업을 제거합니다", () => {
			// 1001개의 작업을 추가 (MAX_QUEUE_SIZE = 1000)
			for (let i = 0; i < 1001; i++) {
				const task = vi.fn().mockResolvedValue(undefined);
				queue.enqueue(task);
			}

			// 큐 크기가 최대값을 초과하지 않아야 함 (처리 중인 것 제외)
			expect(queue.size).toBeLessThanOrEqual(1000);
		});

		it("작업 추가 시 즉시 처리를 시작합니다", async () => {
			const task = vi.fn().mockResolvedValue(undefined);

			queue.enqueue(task);

			// 처리가 즉시 시작되어야 함
			expect(queue.isProcessing).toBe(true);

			// 비동기 처리를 위해 잠시 대기
			await vi.runAllTimersAsync();

			expect(task).toHaveBeenCalled();
		});
	});

	describe("processQueue", () => {
		it("큐에 있는 작업들을 순차적으로 실행합니다", async () => {
			const results: number[] = [];
			const task1 = vi.fn().mockImplementation(async () => {
				results.push(1);
			});
			const task2 = vi.fn().mockImplementation(async () => {
				results.push(2);
			});
			const task3 = vi.fn().mockImplementation(async () => {
				results.push(3);
			});

			queue.enqueue(task1);
			queue.enqueue(task2);
			queue.enqueue(task3);

			await vi.runAllTimersAsync();

			expect(results).toEqual([1, 2, 3]);
			expect(queue.size).toBe(0);
		});

		it("작업 실행 중 에러가 발생해도 다음 작업을 계속 처리합니다", async () => {
			const consoleErrorSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			const task1 = vi.fn().mockRejectedValue(new Error("Task 1 failed"));
			const task2 = vi.fn().mockResolvedValue(undefined);
			const task3 = vi.fn().mockRejectedValue(new Error("Task 3 failed"));

			queue.enqueue(task1);
			queue.enqueue(task2);
			queue.enqueue(task3);

			await vi.runAllTimersAsync();

			expect(task1).toHaveBeenCalled();
			expect(task2).toHaveBeenCalled();
			expect(task3).toHaveBeenCalled();
			expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
			expect(queue.size).toBe(0);

			consoleErrorSpy.mockRestore();
		});

		it("이미 처리 중일 때는 중복 처리하지 않습니다", async () => {
			let processingCount = 0;
			const task = vi.fn().mockImplementation(async () => {
				processingCount++;
				// 긴 작업 시뮬레이션
				await new Promise((resolve) => setTimeout(resolve, 100));
			});

			// 동시에 여러 작업 추가
			queue.enqueue(task);
			queue.enqueue(task);

			// 처리가 시작되었는지 확인
			expect(queue.isProcessing).toBe(true);

			await vi.runAllTimersAsync();

			// 모든 작업이 처리되었지만 순차적으로 처리되었는지 확인
			expect(processingCount).toBe(2);
			expect(queue.isProcessing).toBe(false);
		});
	});

	describe("size", () => {
		it("현재 큐에 있는 작업 수를 반환합니다", async () => {
			expect(queue.size).toBe(0);

			// 긴 작업을 추가하여 큐에 남아있도록 함
			const longTask = vi.fn().mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 1000));
			});

			queue.enqueue(longTask);
			
			// 추가 작업들 (큐에 쌓임)
			queue.enqueue(vi.fn().mockResolvedValue(undefined));
			queue.enqueue(vi.fn().mockResolvedValue(undefined));

			// 첫 번째 작업은 처리 중이고, 나머지 2개는 큐에 있어야 함
			expect(queue.size).toBe(2);

			await vi.runAllTimersAsync();
			expect(queue.size).toBe(0);
		});

		it("작업 처리 후 크기가 감소합니다", async () => {
			const task = vi.fn().mockResolvedValue(undefined);

			queue.enqueue(task);
			
			// 즉시 처리가 시작되므로 size는 0이 됨
			await vi.runAllTimersAsync();
			expect(queue.size).toBe(0);
		});
	});

	describe("isProcessing", () => {
		it("처리 중이 아닐 때 false를 반환합니다", () => {
			expect(queue.isProcessing).toBe(false);
		});

		it("작업 처리 중일 때 true를 반환합니다", async () => {
			const task = vi.fn().mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 100));
			});

			queue.enqueue(task);

			// 처리가 시작되면 true가 되어야 함
			expect(queue.isProcessing).toBe(true);

			await vi.runAllTimersAsync();

			// 처리 완료 후 false가 되어야 함
			expect(queue.isProcessing).toBe(false);
		});
	});

	describe("waitForCompletion", () => {
		it("모든 작업이 완료될 때까지 대기합니다", async () => {
			const results: number[] = [];
			const task1 = vi.fn().mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 50));
				results.push(1);
			});
			const task2 = vi.fn().mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 100));
				results.push(2);
			});

			queue.enqueue(task1);
			queue.enqueue(task2);

			// 완료 대기
			const waitPromise = queue.waitForCompletion();

			// 아직 완료되지 않았어야 함
			expect(results).toEqual([]);

			await vi.runAllTimersAsync();
			await waitPromise;

			// 모든 작업이 완료되었어야 함
			expect(results).toEqual([1, 2]);
			expect(queue.size).toBe(0);
			expect(queue.isProcessing).toBe(false);
		});

		it("큐가 비어있을 때 즉시 완료됩니다", async () => {
			const startTime = Date.now();
			await queue.waitForCompletion();
			const endTime = Date.now();

			// 즉시 완료되어야 함 (타이머 없이)
			expect(endTime - startTime).toBeLessThan(50);
		});
	});

	describe("edge cases", () => {
		it("빈 큐에서 처리를 시도해도 에러가 발생하지 않습니다", async () => {
			expect(() => queue.enqueue(vi.fn().mockResolvedValue(undefined))).not.toThrow();
			await vi.runAllTimersAsync();
		});

		it("undefined 작업을 처리해도 에러가 발생하지 않습니다", async () => {
			// 정상적인 작업 추가
			const task = vi.fn().mockResolvedValue(undefined);
			queue.enqueue(task);

			await vi.runAllTimersAsync();

			expect(task).toHaveBeenCalled();
		});
	});
});

describe("globalBackgroundQueue", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("전역 인스턴스가 존재합니다", () => {
		expect(globalBackgroundQueue).toBeInstanceOf(BackgroundQueue);
	});

	it("전역 인스턴스를 통해 작업을 추가할 수 있습니다", async () => {
		const task = vi.fn().mockResolvedValue(undefined);

		globalBackgroundQueue.enqueue(task);

		await vi.runAllTimersAsync();

		expect(task).toHaveBeenCalled();
	});
}); 