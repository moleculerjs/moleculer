"use strict";

const ServiceBroker = require("../../../src/service-broker");
const { EventCatcher, MockingCalls, createBroker } = require("../../../src/testing");

describe("Test EventCatcher middleware", () => {
	let broker;

	beforeEach(() => {
		broker = new ServiceBroker({
			nodeID: "test-node",
			logger: false,
			middlewares: [EventCatcher]
		});
		return broker.start();
	});

	afterEach(() => {
		return broker.stop();
	});

	it("should register broker.test methods", () => {
		expect(broker.test).toBeDefined();
		expect(broker.test.eventEmitted).toBeInstanceOf(Function);
		expect(broker.test.eventEmittedTimes).toBeInstanceOf(Function);
		expect(broker.test.eventEmittedWithParams).toBeInstanceOf(Function);
		expect(broker.test.waitForEvent).toBeInstanceOf(Function);
		expect(broker.test.clearEvents).toBeInstanceOf(Function);
	});

	it("should capture emitted events", async () => {
		await broker.emit("user.created", { id: 1, name: "John" });
		await broker.emit("user.updated", { id: 1, name: "Jane" });

		expect(broker.test.eventEmitted("user.created")).toBe(true);
		expect(broker.test.eventEmitted("order.created")).toBe(false);
	});

	it("should count event emissions", async () => {
		await broker.emit("user.created", { id: 1 });
		await broker.emit("user.created", { id: 2 });

		expect(broker.test.eventEmittedTimes("user.created")).toBe(2);
		expect(broker.test.eventEmittedTimes("order.created")).toBe(0);
	});

	it("should check event payload", async () => {
		await broker.emit("user.created", { id: 1, name: "John", role: "admin" });

		expect(broker.test.eventEmittedWithParams("user.created", { name: "John" })).toBe(true);
		expect(broker.test.eventEmittedWithParams("user.created", { name: "Bob" })).toBe(false);
	});

	it("should capture broadcast events", async () => {
		await broker.broadcast("system.shutdown", { reason: "maintenance" });

		expect(broker.test.eventEmitted("system.shutdown")).toBe(true);
	});

	it("should capture broadcastLocal events", async () => {
		await broker.broadcastLocal("cache.clear", { pattern: "users" });

		expect(broker.test.eventEmitted("cache.clear")).toBe(true);
	});

	it("should clear captured events", async () => {
		await broker.emit("user.created", { id: 1 });
		broker.test.clearEvents();

		expect(broker.test.eventEmitted("user.created")).toBe(false);
		expect(broker.test.eventEmittedTimes("user.created")).toBe(0);
	});

	it("should wait for event emitted before waitForEvent", async () => {
		await broker.emit("early.event", { data: "early" });

		const payload = await broker.test.waitForEvent("early.event", 500);
		expect(payload).toEqual({ data: "early" });
	});

	it("should wait for event with waitForEvent", async () => {
		const eventPromise = broker.test.waitForEvent("async.event", 1000);

		setTimeout(() => {
			broker.emit("async.event", { data: "hello" });
		}, 50);

		const payload = await eventPromise;
		expect(payload).toEqual({ data: "hello" });
	});

	it("should reject waitForEvent on timeout", async () => {
		await expect(
			broker.test.waitForEvent("never.emitted", 100)
		).rejects.toThrow("Timeout");
	});
});

describe("Test MockingCalls middleware", () => {
	let broker;

	beforeEach(() => {
		broker = new ServiceBroker({
			nodeID: "test-node",
			logger: false,
			middlewares: [MockingCalls]
		});

		broker.createService({
			name: "greeter",
			actions: {
				hello(ctx) {
					return `Hello ${ctx.params.name}`;
				}
			}
		});

		return broker.start();
	});

	afterEach(() => {
		return broker.stop();
	});

	it("should register broker.test methods", () => {
		expect(broker.test).toBeDefined();
		expect(broker.test.mockAction).toBeInstanceOf(Function);
		expect(broker.test.actionCalled).toBeInstanceOf(Function);
		expect(broker.test.actionCalledTimes).toBeInstanceOf(Function);
		expect(broker.test.actionCalledWithParams).toBeInstanceOf(Function);
	});

	it("should track real action calls", async () => {
		const res = await broker.call("greeter.hello", { name: "World" });
		expect(res).toBe("Hello World");

		expect(broker.test.actionCalled("greeter.hello")).toBe(true);
		expect(broker.test.actionCalled("greeter.nonexistent")).toBe(false);
	});

	it("should count action calls", async () => {
		await broker.call("greeter.hello", { name: "A" });
		await broker.call("greeter.hello", { name: "B" });

		expect(broker.test.actionCalledTimes("greeter.hello")).toBe(2);
	});

	it("should track action call params", async () => {
		await broker.call("greeter.hello", { name: "World", age: 25 });

		expect(broker.test.actionCalledWithParams("greeter.hello", { name: "World" })).toBe(true);
		expect(broker.test.actionCalledWithParams("greeter.hello", { name: "Bob" })).toBe(false);
	});

	it("should mock action return value", async () => {
		broker.test.mockAction("greeter.hello").returns("Mocked!");

		const res = await broker.call("greeter.hello", { name: "World" });
		expect(res).toBe("Mocked!");
	});

	it("should mock action with params matching", async () => {
		broker.test.mockAction("greeter.hello").withParams({ name: "Admin" }).returns("Admin reply");
		broker.test.mockAction("greeter.hello").withParams({ name: "User" }).returns("User reply");

		// Unmatched params should call the real handler
		const real = await broker.call("greeter.hello", { name: "World" });
		expect(real).toBe("Hello World");

		// Matched params should return mocked values
		const admin = await broker.call("greeter.hello", { name: "Admin" });
		expect(admin).toBe("Admin reply");

		const user = await broker.call("greeter.hello", { name: "User" });
		expect(user).toBe("User reply");
	});

	it("should mock action error", async () => {
		broker.test.mockAction("greeter.hello").returns(new Error("Mock error"));

		await expect(
			broker.call("greeter.hello", { name: "World" })
		).rejects.toThrow("Mock error");
	});

	it("should clear action tracking", async () => {
		await broker.call("greeter.hello", { name: "World" });
		broker.test.clearActions();

		expect(broker.test.actionCalled("greeter.hello")).toBe(false);
		expect(broker.test.actionCalledTimes("greeter.hello")).toBe(0);
	});
});

describe("Test createBroker", () => {
	it("should create a broker with test flag", () => {
		const broker = createBroker({ nodeID: "test" });
		expect(broker.options.test).toBe(true);
		expect(broker.options.logger).toBe(false);
		return broker.stop();
	});

	it("should register mock services", () => {
		const broker = createBroker(
			{ nodeID: "test" },
			[
				{
					name: "mock",
					actions: {
						ping() { return "pong"; }
					}
				}
			]
		);

		expect(broker.getLocalService("mock")).toBeDefined();
		return broker.stop();
	});

	it("should register testing middlewares", () => {
		const broker = createBroker({ nodeID: "test" });

		expect(broker.test).toBeDefined();
		expect(broker.test.eventEmitted).toBeInstanceOf(Function);
		expect(broker.test.mockAction).toBeInstanceOf(Function);
		return broker.stop();
	});

	it("should work with real calls and event capture", async () => {
		const broker = createBroker(
			{ nodeID: "test" },
			[
				{
					name: "users",
					actions: {
						get(ctx) {
							broker.emit("user.fetched", { id: ctx.params.id });
							return { id: ctx.params.id, name: "Alice" };
						}
					}
				}
			]
		);

		await broker.start();

		const res = await broker.call("users.get", { id: 5 });
		expect(res).toEqual({ id: 5, name: "Alice" });
		expect(broker.test.eventEmitted("user.fetched")).toBe(true);
		expect(broker.test.eventEmittedWithParams("user.fetched", { id: 5 })).toBe(true);

		await broker.stop();
	});
});
