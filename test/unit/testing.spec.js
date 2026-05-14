"use strict";

const { createBroker, EventCatcher, MockingCalls } = require("../../src/testing");

describe("Testing Helpers", () => {
	describe("createBroker", () => {
		it("should create a broker with a test namespace", async () => {
			const broker = createBroker();
			expect(broker).toBeDefined();
			expect(broker.test).toBeDefined();
			await broker.stop();
		});

		it("should disable logging by default", async () => {
			const broker = createBroker();
			expect(broker.options.logger).toBe(false);
			await broker.stop();
		});

		it("should allow overriding broker options", async () => {
			const broker = createBroker({ nodeID: "test-node" });
			expect(broker.nodeID).toBe("test-node");
			await broker.stop();
		});

		it("should load services passed via options", async () => {
			const broker = createBroker({
				services: [
					{
						name: "greeter",
						actions: {
							hello: () => "world",
						},
					},
				],
			});
			await broker.start();
			const res = await broker.call("greeter.hello");
			expect(res).toBe("world");
			await broker.stop();
		});
	});

	describe("EventCatcher", () => {
		let broker;

		beforeEach(async () => {
			broker = createBroker();
			await broker.start();
		});

		afterEach(() => broker.stop());

		it("should detect emitted events", () => {
			broker.emit("user.created", { id: 1 });
			expect(broker.test.eventEmitted("user.created")).toBe(true);
			expect(broker.test.eventEmitted("user.deleted")).toBe(false);
		});

		it("should count emitted events", () => {
			broker.emit("user.created", { id: 1 });
			broker.emit("user.created", { id: 2 });
			expect(broker.test.eventEmittedTimes("user.created")).toBe(2);
			expect(broker.test.eventEmittedTimes("user.deleted")).toBe(0);
		});

		it("should match event params using deep partial matching", () => {
			broker.emit("user.created", { id: 1, name: "Babacar", role: "admin" });
			expect(broker.test.eventEmittedWithParams("user.created", { id: 1 })).toBe(true);
			expect(broker.test.eventEmittedWithParams("user.created", { name: "Babacar" })).toBe(true);
			expect(broker.test.eventEmittedWithParams("user.created", { id: 99 })).toBe(false);
		});

		it("should capture broadcast events", () => {
			broker.broadcast("order.shipped", { orderId: 42 });
			expect(broker.test.eventEmitted("order.shipped")).toBe(true);
			expect(broker.test.eventEmittedWithParams("order.shipped", { orderId: 42 })).toBe(true);
		});

		it("should capture broadcastLocal events", () => {
			broker.broadcastLocal("cache.cleared", { key: "users" });
			expect(broker.test.eventEmitted("cache.cleared")).toBe(true);
		});

		it("should clear captured events", () => {
			broker.emit("user.created", { id: 1 });
			broker.test.clearEvents();
			expect(broker.test.eventEmitted("user.created")).toBe(false);
			expect(broker.test.eventEmittedTimes("user.created")).toBe(0);
		});
	});

	describe("MockingCalls", () => {
		let broker;

		beforeEach(async () => {
			broker = createBroker();
			await broker.start();
		});

		afterEach(() => broker.stop());

		it("should return a mocked static response", async () => {
			broker.test.mockAction("users.get", { id: 1, name: "Babacar" });
			const res = await broker.call("users.get", { id: 1 });
			expect(res).toEqual({ id: 1, name: "Babacar" });
		});

		it("should support factory mocks", async () => {
			broker.test.mockAction("users.get", (params) => ({ ...params, fetched: true }));
			const res = await broker.call("users.get", { id: 42 });
			expect(res).toEqual({ id: 42, fetched: true });
		});

		it("should detect called actions", async () => {
			broker.test.mockAction("users.get", null);
			await broker.call("users.get", { id: 1 });
			expect(broker.test.actionCalled("users.get")).toBe(true);
			expect(broker.test.actionCalled("users.delete")).toBe(false);
		});

		it("should count action calls", async () => {
			broker.test.mockAction("users.get", null);
			await broker.call("users.get", { id: 1 });
			await broker.call("users.get", { id: 2 });
			expect(broker.test.actionCalledTimes("users.get")).toBe(2);
		});

		it("should match call params using deep partial matching", async () => {
			broker.test.mockAction("users.create", { id: 99 });
			await broker.call("users.create", { name: "Babacar", role: "admin" });
			expect(broker.test.actionCalledWithParams("users.create", { name: "Babacar" })).toBe(true);
			expect(broker.test.actionCalledWithParams("users.create", { role: "admin" })).toBe(true);
			expect(broker.test.actionCalledWithParams("users.create", { name: "Other" })).toBe(false);
		});

		it("should clear mocks and call history", async () => {
			broker.test.mockAction("users.get", { id: 1 });
			await broker.call("users.get", { id: 1 });
			broker.test.clearActions();
			expect(broker.test.actionCalled("users.get")).toBe(false);
			expect(broker.test.actionCalledTimes("users.get")).toBe(0);
		});
	});

	describe("EventCatcher class (standalone)", () => {
		it("should work as a standalone middleware", () => {
			const catcher = new EventCatcher();
			const mw = catcher.middleware();
			expect(mw.name).toBe("EventCatcher");
			expect(typeof mw.emit).toBe("function");
		});
	});

	describe("MockingCalls class (standalone)", () => {
		it("should work as a standalone middleware", () => {
			const mocker = new MockingCalls();
			const mw = mocker.middleware();
			expect(mw.name).toBe("MockingCalls");
			expect(typeof mw.call).toBe("function");
		});
	});
});
