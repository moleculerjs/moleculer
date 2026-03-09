/*
 * moleculer
 * Copyright (c) 2024 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { Testing } = require("../../index");
const { createBroker, EventCatcher, MockingCalls } = Testing;

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

async function stopBroker(broker) {
	try {
		await broker.stop();
	} catch (_) {
		// ignore stop errors in test teardown
	}
}

// ──────────────────────────────────────────────────────────────────────────────
// createBroker
// ──────────────────────────────────────────────────────────────────────────────

describe("createBroker()", () => {
	it("creates a broker with logger disabled", () => {
		const broker = createBroker();
		expect(broker).toBeDefined();
		expect(broker.options.logger).toBe(false);
		expect(broker.options.test).toBe(true);
	});

	it("attaches broker.test namespace", () => {
		const broker = createBroker();
		expect(broker.test).toBeDefined();
		expect(typeof broker.test.eventEmitted).toBe("function");
		expect(typeof broker.test.mockAction).toBe("function");
	});

	it("merges custom broker options", () => {
		const broker = createBroker({ nodeID: "test-node-custom" });
		expect(broker.nodeID).toBe("test-node-custom");
		expect(broker.options.test).toBe(true);
		expect(broker.options.logger).toBe(false);
	});

	it("appends user-supplied middlewares after test middlewares", () => {
		const customMiddleware = {
			name: "Custom",
			created: jest.fn()
		};
		createBroker({ middlewares: [customMiddleware] });
		expect(customMiddleware.created).toHaveBeenCalledTimes(1);
	});

	it("registers mock services before start", async () => {
		const listFn = jest.fn(async () => [1, 2, 3]);
		const broker = createBroker({}, [{ name: "posts", actions: { list: listFn } }]);
		await broker.start();

		const res = await broker.call("posts.list", { limit: 5 });
		expect(res).toEqual([1, 2, 3]);

		const ctx = listFn.mock.calls[0][0];
		expect(ctx.params).toEqual({ limit: 5 });

		await stopBroker(broker);
	});

	it("handles empty mockServices array", () => {
		expect(() => createBroker({}, [])).not.toThrow();
	});

	it("handles omitted arguments", () => {
		expect(() => createBroker()).not.toThrow();
	});
});

// ──────────────────────────────────────────────────────────────────────────────
// EventCatcher
// ──────────────────────────────────────────────────────────────────────────────

describe("EventCatcher middleware", () => {
	let broker;

	beforeAll(async () => {
		broker = createBroker();

		// Service that re-emits an event after a short async delay
		broker.createService({
			name: "posts",
			events: {
				async "posts.addedComment"(ctx) {
					await new Promise(res => setTimeout(res, 50));
					this.broker.emit("posts.updated", { postID: ctx.params.postID });
				}
			}
		});

		await broker.start();
	});

	afterAll(() => stopBroker(broker));

	beforeEach(() => broker.test.clearEvents());

	describe("emit()", () => {
		it("captures broker.emit() calls", () => {
			broker.emit("test.event", { value: 1 });
			expect(broker.test.eventEmitted("test.event")).toBe(true);
		});

		it("records payload", () => {
			broker.emit("payload.event", { x: 42 });
			const events = broker.test.getEvents("payload.event");
			expect(events[0].payload).toEqual({ x: 42 });
			expect(events[0].type).toBe("emit");
		});
	});

	describe("broadcast()", () => {
		it("captures broker.broadcast() calls", () => {
			broker.broadcast("broadcast.event", { a: 1 });
			expect(broker.test.eventEmitted("broadcast.event")).toBe(true);
		});

		it("records type as 'broadcast'", () => {
			broker.broadcast("broadcast.typed", {});
			const [entry] = broker.test.getEvents("broadcast.typed");
			expect(entry.type).toBe("broadcast");
		});
	});

	describe("broadcastLocal()", () => {
		it("captures broker.broadcastLocal() calls", () => {
			broker.broadcastLocal("local.event", { b: 2 });
			expect(broker.test.eventEmitted("local.event")).toBe(true);
		});

		it("records type as 'broadcastLocal'", () => {
			broker.broadcastLocal("local.typed", {});
			const [entry] = broker.test.getEvents("local.typed");
			expect(entry.type).toBe("broadcastLocal");
		});
	});

	describe("eventEmitted()", () => {
		it("returns false for events that were never emitted", () => {
			expect(broker.test.eventEmitted("never.emitted")).toBe(false);
		});

		it("returns true after the event is emitted", () => {
			broker.emit("later.event", {});
			expect(broker.test.eventEmitted("later.event")).toBe(true);
		});
	});

	describe("eventEmittedTimes()", () => {
		it("returns 0 when event was never emitted", () => {
			expect(broker.test.eventEmittedTimes("ghost.event")).toBe(0);
		});

		it("counts each emission independently", () => {
			broker.emit("counted.event", { i: 1 });
			broker.emit("counted.event", { i: 2 });
			broker.emit("counted.event", { i: 3 });
			expect(broker.test.eventEmittedTimes("counted.event")).toBe(3);
		});
	});

	describe("eventEmittedWithParams()", () => {
		it("returns true when payload matches exactly", () => {
			broker.emit("exact.event", { id: 7 });
			expect(broker.test.eventEmittedWithParams("exact.event", { id: 7 })).toBe(true);
		});

		it("returns false when payload differs", () => {
			broker.emit("exact.event2", { id: 7 });
			expect(broker.test.eventEmittedWithParams("exact.event2", { id: 99 })).toBe(false);
		});

		it("returns false when event was never emitted", () => {
			expect(broker.test.eventEmittedWithParams("absent.event", { x: 1 })).toBe(false);
		});
	});

	describe("getEvents()", () => {
		it("returns all events when called without filter", () => {
			broker.emit("alpha", {});
			broker.emit("beta", {});
			const all = broker.test.getEvents();
			expect(all.length).toBe(2);
		});

		it("filters by event name", () => {
			broker.emit("filtered.alpha", { n: 1 });
			broker.emit("filtered.beta", { n: 2 });
			broker.emit("filtered.alpha", { n: 3 });
			const alpha = broker.test.getEvents("filtered.alpha");
			expect(alpha.length).toBe(2);
			expect(alpha.every(e => e.eventName === "filtered.alpha")).toBe(true);
		});

		it("returns a copy — mutations do not affect internal state", () => {
			broker.emit("copy.test", {});
			const copy = broker.test.getEvents();
			const before = broker.test.eventEmittedTimes("copy.test");
			copy.length = 0;
			expect(broker.test.eventEmittedTimes("copy.test")).toBe(before);
		});
	});

	describe("clearEvents()", () => {
		it("removes all recorded events", () => {
			broker.emit("will.clear", {});
			expect(broker.test.eventEmitted("will.clear")).toBe(true);
			broker.test.clearEvents();
			expect(broker.test.eventEmitted("will.clear")).toBe(false);
			expect(broker.test.getEvents().length).toBe(0);
		});
	});

	describe("waitForEvent()", () => {
		it("resolves immediately if event already captured", async () => {
			broker.emit("already.there", { val: 1 });
			const entry = await broker.test.waitForEvent("already.there");
			expect(entry.eventName).toBe("already.there");
			expect(entry.payload).toEqual({ val: 1 });
		});

		it("waits for a future async event and resolves", async () => {
			broker.emit("posts.addedComment", { postID: 42 });
			const entry = await broker.test.waitForEvent("posts.updated", 2000);
			expect(entry.eventName).toBe("posts.updated");
			expect(entry.payload).toEqual({ postID: 42 });
		});

		it("rejects with a descriptive error when event never arrives", async () => {
			await expect(broker.test.waitForEvent("will.not.come", 100)).rejects.toThrow(
				/Timeout waiting for event "will\.not\.come" after 100ms/
			);
		});
	});
});

// ──────────────────────────────────────────────────────────────────────────────
// MockingCalls
// ──────────────────────────────────────────────────────────────────────────────

describe("MockingCalls middleware", () => {
	let broker;

	beforeAll(async () => {
		broker = createBroker();

		broker.createService({
			name: "posts",
			actions: {
				async get(ctx) {
					const post = { id: ctx.params.id, title: "Post title", authorID: 5 };
					post.author = await ctx.call("users.get", { id: post.authorID });
					return post;
				}
			}
		});

		await broker.start();
	});

	afterAll(() => stopBroker(broker));

	beforeEach(() => broker.test.clearAll());

	describe("mockAction() – returnValue", () => {
		it("intercepts and returns mocked value", async () => {
			broker.test
				.mockAction("users.get")
				.withParams({ id: 5 })
				.returnValue({ id: 5, name: "John", email: "john@moleculer.services" });

			const res = await broker.call("posts.get", { id: 2 });
			expect(res.author).toEqual({
				id: 5,
				name: "John",
				email: "john@moleculer.services"
			});
		});

		it("mocks without params filter (matches any params)", async () => {
			broker.test.mockAction("users.get").returnValue({ id: 99, name: "Anyone" });
			const res = await broker.call("posts.get", { id: 1 });
			expect(res.author).toEqual({ id: 99, name: "Anyone" });
		});
	});

	describe("mockAction() – rejectWith", () => {
		it("rejects with an Error object", async () => {
			broker.test.mockAction("users.get").rejectWith(new Error("User not found"));
			await expect(broker.call("posts.get", { id: 1 })).rejects.toThrow("User not found");
		});

		it("wraps a plain string in Error", async () => {
			broker.test.mockAction("users.get").rejectWith("Forbidden");
			await expect(broker.call("posts.get", { id: 1 })).rejects.toThrow("Forbidden");
		});
	});

	describe("mockAction() – withMeta", () => {
		it("matches only when meta deep-equals the constraint", async () => {
			broker.test
				.mockAction("users.get")
				.withParams({ id: 5 })
				.withMeta({ token: "abc" })
				.returnValue({ id: 5, name: "Secure John" });

			// Direct call with matching meta
			const res = await broker.call("users.get", { id: 5 }, { meta: { token: "abc" } });
			expect(res).toEqual({ id: 5, name: "Secure John" });
		});
	});

	describe("actionCalled()", () => {
		it("returns false when action was never called", () => {
			expect(broker.test.actionCalled("ghost.action")).toBe(false);
		});

		it("returns true after the action is called", async () => {
			broker.test.mockAction("users.get").returnValue({});
			await broker.call("posts.get", { id: 1 });
			expect(broker.test.actionCalled("posts.get")).toBe(true);
			expect(broker.test.actionCalled("users.get")).toBe(true);
		});
	});

	describe("actionCalledTimes()", () => {
		it("returns 0 when never called", () => {
			expect(broker.test.actionCalledTimes("never.called")).toBe(0);
		});

		it("counts calls correctly across multiple invocations", async () => {
			broker.test.mockAction("users.get").returnValue({});
			await broker.call("posts.get", { id: 1 });
			await broker.call("posts.get", { id: 2 });
			expect(broker.test.actionCalledTimes("posts.get")).toBe(2);
			expect(broker.test.actionCalledTimes("users.get")).toBe(2);
		});
	});

	describe("actionCalledWithParams()", () => {
		it("returns true when params match exactly", async () => {
			broker.test.mockAction("users.get").returnValue({});
			await broker.call("posts.get", { id: 3 });
			expect(broker.test.actionCalledWithParams("users.get", { id: 5 })).toBe(true);
		});

		it("returns false when params differ", async () => {
			broker.test.mockAction("users.get").returnValue({});
			await broker.call("posts.get", { id: 1 });
			expect(broker.test.actionCalledWithParams("users.get", { id: 999 })).toBe(false);
		});

		it("returns false for uncalled action", () => {
			expect(broker.test.actionCalledWithParams("uncalled", { x: 1 })).toBe(false);
		});
	});

	describe("getCalls()", () => {
		it("returns all calls without a filter", async () => {
			broker.test.mockAction("users.get").returnValue({});
			await broker.call("posts.get", { id: 1 });
			const all = broker.test.getCalls();
			expect(all.length).toBeGreaterThanOrEqual(2); // posts.get + users.get
		});

		it("filters by action name", async () => {
			broker.test.mockAction("users.get").returnValue({});
			await broker.call("posts.get", { id: 1 });
			const userCalls = broker.test.getCalls("users.get");
			expect(userCalls.length).toBe(1);
			expect(userCalls[0].actionName).toBe("users.get");
		});

		it("returns a copy — mutations do not affect internal state", async () => {
			broker.test.mockAction("users.get").returnValue({});
			await broker.call("posts.get", { id: 1 });
			const copy = broker.test.getCalls();
			const before = broker.test.actionCalledTimes("posts.get");
			copy.length = 0;
			expect(broker.test.actionCalledTimes("posts.get")).toBe(before);
		});
	});

	describe("clearActions()", () => {
		it("removes recorded calls but leaves mocks active", async () => {
			broker.test.mockAction("users.get").returnValue({ id: 1 });
			await broker.call("posts.get", { id: 1 });
			expect(broker.test.actionCalled("posts.get")).toBe(true);

			broker.test.clearActions();
			expect(broker.test.actionCalled("posts.get")).toBe(false);

			// Mock is still active; calling again should still be intercepted
			const res = await broker.call("posts.get", { id: 2 });
			expect(res.author).toEqual({ id: 1 });
		});
	});

	describe("clearMocks()", () => {
		it("removes mocks but preserves call history", async () => {
			broker.test.mockAction("users.get").returnValue({ id: 5, name: "John" });
			await broker.call("posts.get", { id: 1 });
			expect(broker.test.actionCalled("posts.get")).toBe(true);

			broker.test.clearMocks();

			// No mock is active now, so the next call falls through to the real action
			// which will fail because there is no real users.get — that's expected
			await expect(broker.call("posts.get", { id: 1 })).rejects.toBeDefined();
			// But call history before clearMocks should still be there
			expect(broker.test.actionCalledTimes("posts.get")).toBe(2);
		});
	});

	describe("clearAll()", () => {
		it("clears both calls and mocks", async () => {
			broker.test.mockAction("users.get").returnValue({});
			await broker.call("posts.get", { id: 1 });
			broker.test.clearAll();
			expect(broker.test.actionCalled("posts.get")).toBe(false);
		});

		it("also clears events when EventCatcher is active", () => {
			broker.emit("some.event", {});
			broker.test.clearAll();
			expect(broker.test.eventEmitted("some.event")).toBe(false);
		});
	});
});

// ──────────────────────────────────────────────────────────────────────────────
// Module exports
// ──────────────────────────────────────────────────────────────────────────────

describe("Testing module exports", () => {
	it("exports Testing from the main moleculer module", () => {
		const { Testing: T } = require("../../index");
		expect(T).toBeDefined();
		expect(T.createBroker).toBeInstanceOf(Function);
		expect(T.EventCatcher).toBeInstanceOf(Function);
		expect(T.MockingCalls).toBeInstanceOf(Function);
	});

	it("EventCatcher() returns a middleware object with required hooks", () => {
		const mw = EventCatcher();
		expect(mw.name).toBe("EventCatcher");
		expect(mw.created).toBeInstanceOf(Function);
		expect(mw.emit).toBeInstanceOf(Function);
		expect(mw.broadcast).toBeInstanceOf(Function);
		expect(mw.broadcastLocal).toBeInstanceOf(Function);
	});

	it("MockingCalls() returns a middleware object with required hooks", () => {
		const mw = MockingCalls();
		expect(mw.name).toBe("MockingCalls");
		expect(mw.created).toBeInstanceOf(Function);
		expect(mw.call).toBeInstanceOf(Function);
	});

	it("each EventCatcher() call creates an isolated event store", () => {
		const broker1 = createBroker();
		const broker2 = createBroker();

		broker1.emit("isolated.event", { source: 1 });
		expect(broker1.test.eventEmitted("isolated.event")).toBe(true);
		expect(broker2.test.eventEmitted("isolated.event")).toBe(false);
	});

	it("each MockingCalls() call creates an isolated call store", async () => {
		const broker1 = createBroker({}, [
			{ name: "greeter", actions: { hello: async () => "hi from broker1" } }
		]);
		const broker2 = createBroker({}, [
			{ name: "greeter", actions: { hello: async () => "hi from broker2" } }
		]);

		await broker1.start();
		await broker2.start();

		await broker1.call("greeter.hello", {});

		expect(broker1.test.actionCalled("greeter.hello")).toBe(true);
		expect(broker2.test.actionCalled("greeter.hello")).toBe(false);

		await stopBroker(broker1);
		await stopBroker(broker2);
	});
});
