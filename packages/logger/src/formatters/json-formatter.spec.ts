import { describe, it, expect } from "vitest";
import { JsonFormatter } from "./json-formatter";

describe("JsonFormatter", () => {
	const formatter = new JsonFormatter();
	const testDate = new Date("2024-01-01T12:30:45.123Z");
	const testMeta = { userId: "123", action: "login" };

	it("JSON 포맷으로 로그를 포맷팅합니다", () => {
		const result = formatter.format(
			"warn",
			"warning message",
			testMeta,
			testDate,
		);
		const parsed = JSON.parse(result.trim());

		expect(parsed).toEqual({
			timestamp: "2024-01-01T12:30:45.123Z",
			level: "WARN",
			message: "warning message",
			userId: "123",
			action: "login",
		});
	});

	it("메타데이터가 없을 때 JSON 포맷으로 로그를 포맷팅합니다", () => {
		const result = formatter.format("debug", "debug message", {}, testDate);
		const parsed = JSON.parse(result.trim());

		expect(parsed).toEqual({
			timestamp: "2024-01-01T12:30:45.123Z",
			level: "DEBUG",
			message: "debug message",
		});
	});

	it("중첩된 메타데이터를 올바르게 직렬화합니다", () => {
		const complexMeta = {
			user: { id: 123, name: "John" },
			tags: ["auth", "login"],
			nested: { deep: { value: true } },
		};

		const result = formatter.format(
			"info",
			"complex data",
			complexMeta,
			testDate,
		);
		const parsed = JSON.parse(result.trim());

		expect(parsed.user).toEqual({ id: 123, name: "John" });
		expect(parsed.tags).toEqual(["auth", "login"]);
		expect(parsed.nested.deep.value).toBe(true);
	});
});
