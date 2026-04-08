"use strict";

const { createBroker, EventCatcher, MockingCalls } = require("../../src/testing");

describe("Testing helpers", () => {
	describe("createBroker", () => {
		it("creates a broker with logger disabled", async () => {
			const broker = createBroker();
			try {
				await broker.start();
				expect(broker.options.logger).toBe(false);
				expect(broker.options.test).toBe(true);
			} finally {
				await broker.stop();
			}
		});

		it("merges user options", async () => {
			const broker = createBroker({ nodeID: "node-test-100" });
			try {
				await broker.start();
				expect(broker.nodeID).toBe("node-test-100");
			} finally {
				await broker.stop();
			}
		});

		it("registers mock services", async () => {
			const listFn = jest.fn(async () => [1, 2, 3]);
			const broker = createBroker({}, [
				{ name: "posts", actions: { list: listFn } },
			]);
			try {
				await broker.start();
				const res = await broker.call("posts.list", { limit: 5 });
				expect(res).toEqual([1, 2, 3]);
				expect(listFn).toHaveBeenCalledTimes(1);
				const ctx = listFn.mock.calls[0][0];
				expect(ctx.params).toEqual({ limit: 5 });
			} finally {
				await broker.stop();
			}
		});

		it("attaches broker.test namespace", async () => {
			const broker = createBroker();
			try {
				await broker.start();
				expect(typeof broker.test).toBe("object");
				expect(typeof broker.test.waitForEvent).toBe("function");
				expect(typeof broker.test.mockAction).toBe("function");
			} finally {
				await broker.stop();
			}
		});

		it("registers additional user middlewares", async () => {
			let hookCalled = false;
			const userMw = { name: "UserMW", created() { hookCalled = true; } };
			const broker = createBroker({ middlewares: [userMw] });
			try {
				await broker.start();
				expect(hookCalled).toBe(true);
			} finally {
				await broker.stop();
			}
		});
	});

	describe("EventCatcher", () => {
		let broker;

		beforeEach(async () => {
			broker = createBroker();
			broker.createService({
				name: "emitter",
				actions: {
					fire(ctx) {
						return ctx.emit("thing.happened", { id: ctx.params.id });
					},
				},
			});
			await broker.start();
		});

		afterEach(() => broker.stop());

		it("records emitted events", async () => {
			await broker.call("emitter.fire", { id: 42 });
			expect(broker.test.eventEmitted("thing.happened")).toBe(true);
		});

		it("counts emitted events", async () => {
			await broker.call("emitter.fire", { id: 1 });
			await broker.call("emitter.fire", { id: 2 });
			expect(broker.test.eventEmittedTimes("thing.happened")).toBe(2);
		});

		it("checks payload match", async () => {
			await broker.call("emitter.fire", { id: 7 });
			expect(broker.test.eventEmittedWithParams("thing.happened", { id: 7 })).toBe(true);
			expect(broker.test.eventEmittedWithParams("thing.happened", { id: 999 })).toBe(false);
		});

		it("returns false for unrecorded events", () => {
			expect(broker.test.eventEmitted("never.happened")).toBe(false);
			expect(broker.test.eventEmittedTimes("never.happened")).toBe(0);
		});

		it("waitForEvent resolves when event arrives", async () => {
			const wait = broker.test.waitForEvent("async.done");
			await broker.emit("async.done", {});
			await expect(wait).resolves.toBeUndefined();
		});

		it("waitForEvent resolves immediately when already emitted", async () => {
			await broker.emit("already.fired", {});
			await expect(broker.test.waitForEvent("already.fired")).resolves.toBeUndefined();
		});

		it("waitForEvent rejects on timeout", async () => {
			await expect(
				broker.test.waitForEvent("never.comes", 50)
			).rejects.toThrow(/timed out/);
		});

		it("clearEvents resets recorded state", async () => {
			await broker.call("emitter.fire", { id: 1 });
			broker.test.clearEvents();
			expect(broker.test.eventEmitted("thing.happened")).toBe(false);
			expect(broker.test.getEvents()).toHaveLength(0);
		});

		it("records broadcast events", async () => {
			await broker.broadcastLocal("local.event", { x: 1 });
			expect(broker.test.eventEmitted("local.event")).toBe(true);
		});
	});

	describe("MockingCalls", () => {
		let broker;

		beforeEach(async () => {
			broker = createBroker();
			broker.createService({
				name: "users",
				actions: {
					async get(ctx) {
						return { id: ctx.params.id, name: "real-user" };
					},
				},
			});
			await broker.start();
		});

		afterEach(() => broker.stop());

		it("records action calls", async () => {
			await broker.call("users.get", { id: 1 });
			expect(broker.test.actionCalled("users.get")).toBe(true);
			expect(broker.test.actionCalledTimes("users.get")).toBe(1);
		});

		it("counts action calls", async () => {
			await broker.call("users.get", { id: 1 });
			await broker.call("users.get", { id: 2 });
			expect(broker.test.actionCalledTimes("users.get")).toBe(2);
		});

		it("checks call params", async () => {
			await broker.call("users.get", { id: 5 });
			expect(broker.test.actionCalledWithParams("users.get", { id: 5 })).toBe(true);
			expect(broker.test.actionCalledWithParams("users.get", { id: 999 })).toBe(false);
		});

		it("mocks a return value", async () => {
			broker.test.mockAction("users.get").returnValue({ id: 5, name: "mocked" });
			const res = await broker.call("users.get", { id: 5 });
			expect(res).toEqual({ id: 5, name: "mocked" });
		});

		it("mocks with param matching", async () => {
			broker.test
				.mockAction("users.get")
				.withParams({ id: 5 })
				.returnValue({ id: 5, name: "John" });

			const res = await broker.call("users.get", { id: 5 });
			expect(res).toEqual({ id: 5, name: "John" });

			// No mock for id: 99 — falls through to real handler
			const real = await broker.call("users.get", { id: 99 });
			expect(real.name).toBe("real-user");
		});

		it("mocks with rejectWith", async () => {
			broker.test
				.mockAction("users.get")
				.rejectWith(new Error("not found"));

			await expect(broker.call("users.get", {})).rejects.toThrow("not found");
		});

		it("clearActions resets call history", async () => {
			await broker.call("users.get", { id: 1 });
			broker.test.clearActions();
			expect(broker.test.actionCalled("users.get")).toBe(false);
			expect(broker.test.getCalls()).toHaveLength(0);
		});

		it("clearMocks removes registered mocks", async () => {
			broker.test.mockAction("users.get").returnValue({ id: 0, name: "mocked" });
			broker.test.clearMocks();
			const res = await broker.call("users.get", { id: 1 });
			expect(res.name).toBe("real-user");
		});

		it("clearAll clears mocks, calls, and events", async () => {
			await broker.emit("some.event", {});
			await broker.call("users.get", { id: 1 });
			broker.test.mockAction("users.get").returnValue({});

			broker.test.clearAll();

			expect(broker.test.actionCalled("users.get")).toBe(false);
			expect(broker.test.eventEmitted("some.event")).toBe(false);
		});
	});

	describe("named exports", () => {
		it("exports EventCatcher, MockingCalls, createBroker", () => {
			expect(typeof EventCatcher).toBe("object");
			expect(typeof MockingCalls).toBe("object");
			expect(typeof createBroker).toBe("function");
		});

		it("EventCatcher has the correct name", () => {
			expect(EventCatcher.name).toBe("EventCatcher");
		});

		it("MockingCalls has the correct name", () => {
			expect(MockingCalls.name).toBe("MockingCalls");
		});

		it("EventCatcher and MockingCalls are usable standalone as middlewares", async () => {
			const ServiceBroker = require("../../src/service-broker");
			const broker = new ServiceBroker({
				logger: false,
				middlewares: [EventCatcher, MockingCalls],
			});
			try {
				await broker.start();
				expect(typeof broker.test.waitForEvent).toBe("function");
				expect(typeof broker.test.mockAction).toBe("function");
			} finally {
				await broker.stop();
			}
		});
	});
});

