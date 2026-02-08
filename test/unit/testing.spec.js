"use strict";

const { Testing } = require("../../index");
const { createBroker, EventCatcher, MockingCalls } = Testing;

describe("Testing helpers", () => {

	describe("createBroker", () => {

		it("should create a broker with test defaults", () => {
			const broker = createBroker();
			expect(broker).toBeDefined();
			expect(broker.options.logger).toBe(false);
			expect(broker.options.test).toBe(true);
			expect(broker.test).toBeDefined();
		});

		it("should merge custom options", () => {
			const broker = createBroker({ nodeID: "test-node-100" });
			expect(broker.nodeID).toBe("test-node-100");
			expect(broker.options.test).toBe(true);
		});

		it("should register mock services", async () => {
			const listFn = jest.fn(async () => [1, 2, 3]);

			const broker = createBroker({}, [
				{
					name: "posts",
					actions: {
						list: listFn
					}
				}
			]);

			await broker.start();

			const res = await broker.call("posts.list", { limit: 5 });
			expect(res).toEqual([1, 2, 3]);
			expect(listFn).toBeCalledTimes(1);

			const ctx = listFn.mock.calls[0][0];
			expect(ctx.params).toEqual({ limit: 5 });

			await broker.stop();
		});
	});

	describe("EventCatcher middleware", () => {
		let broker;

		beforeAll(async () => {
			broker = createBroker();

			broker.createService({
				name: "posts",
				events: {
					async "posts.addedComment"(ctx) {
						this.broker.emit("posts.updated", { postID: ctx.params.postID });
					}
				}
			});

			await broker.start();
		});

		afterAll(() => broker.stop());

		beforeEach(() => {
			broker.test.clearEvents();
		});

		it("should detect emitted events", async () => {
			broker.emit("posts.addedComment", { postID: 5 });

			// Wait for the event handler to fire
			await broker.test.waitForEvent("posts.updated", 2000);

			expect(broker.test.eventEmitted("posts.updated")).toBe(true);
			expect(broker.test.eventEmittedTimes("posts.updated")).toBe(1);
			expect(broker.test.eventEmittedWithParams("posts.updated", { postID: 5 })).toBe(true);
		});

		it("should return false for events not emitted", () => {
			expect(broker.test.eventEmitted("nonexistent.event")).toBe(false);
			expect(broker.test.eventEmittedTimes("nonexistent.event")).toBe(0);
		});

		it("should track multiple emissions", () => {
			broker.emit("test.event", { a: 1 });
			broker.emit("test.event", { a: 2 });
			broker.emit("test.event", { a: 3 });

			expect(broker.test.eventEmittedTimes("test.event")).toBe(3);
		});

		it("should clear events", () => {
			broker.emit("test.event", { a: 1 });
			expect(broker.test.eventEmitted("test.event")).toBe(true);

			broker.test.clearEvents();
			expect(broker.test.eventEmitted("test.event")).toBe(false);
		});

		it("should get all captured events", () => {
			broker.emit("event.a", { x: 1 });
			broker.emit("event.b", { y: 2 });

			const all = broker.test.getEvents();
			expect(all.length).toBe(2);

			const filtered = broker.test.getEvents("event.a");
			expect(filtered.length).toBe(1);
			expect(filtered[0].payload).toEqual({ x: 1 });
		});

		it("should detect broadcast events", () => {
			broker.broadcast("broadcast.test", { z: 1 });
			expect(broker.test.eventEmitted("broadcast.test")).toBe(true);
		});

		it("should detect broadcastLocal events", () => {
			broker.broadcastLocal("local.test", { z: 1 });
			expect(broker.test.eventEmitted("local.test")).toBe(true);
		});

		it("should timeout waitForEvent if event not emitted", async () => {
			await expect(
				broker.test.waitForEvent("never.happens", 100)
			).rejects.toThrow("Timeout waiting for event");
		});
	});

	describe("MockingCalls middleware", () => {
		let broker;

		beforeAll(async () => {
			broker = createBroker();

			broker.createService({
				name: "posts",
				actions: {
					async get(ctx) {
						const post = { id: ctx.params.id, title: "Test Post", authorID: 5 };
						const author = await ctx.call("users.get", { id: post.authorID });
						post.author = author;
						return post;
					}
				}
			});

			await broker.start();
		});

		afterAll(() => broker.stop());

		beforeEach(() => {
			broker.test.clearActions();
			broker.test.clearMocks();
		});

		it("should mock action calls with return value", async () => {
			broker.test.mockAction("users.get")
				.withParams({ id: 5 })
				.returnValue({ id: 5, name: "John", email: "john@moleculer.services" });

			const res = await broker.call("posts.get", { id: 2 });

			expect(res).toEqual({
				id: 2,
				title: "Test Post",
				authorID: 5,
				author: { id: 5, name: "John", email: "john@moleculer.services" }
			});

			expect(broker.test.actionCalled("users.get")).toBe(true);
			expect(broker.test.actionCalledTimes("users.get")).toBe(1);
			expect(broker.test.actionCalledWithParams("users.get", { id: 5 })).toBe(true);
		});

		it("should track broker.call invocations", async () => {
			broker.test.mockAction("users.get").returnValue({ id: 5, name: "John" });

			await broker.call("posts.get", { id: 1 });

			// posts.get is called by us, users.get is called internally
			expect(broker.test.actionCalled("posts.get")).toBe(true);
			expect(broker.test.actionCalled("users.get")).toBe(true);
			expect(broker.test.actionCalledTimes("posts.get")).toBe(1);
		});

		it("should return false for actions not called", () => {
			expect(broker.test.actionCalled("nonexistent.action")).toBe(false);
			expect(broker.test.actionCalledTimes("nonexistent.action")).toBe(0);
		});

		it("should clear captured calls", async () => {
			broker.test.mockAction("users.get").returnValue({ id: 1 });
			await broker.call("posts.get", { id: 1 });

			expect(broker.test.actionCalled("posts.get")).toBe(true);

			broker.test.clearActions();
			expect(broker.test.actionCalled("posts.get")).toBe(false);
		});

		it("should mock action without params filter", async () => {
			broker.test.mockAction("users.get").returnValue({ id: 99, name: "Any" });

			const res = await broker.call("posts.get", { id: 7 });
			expect(res.author).toEqual({ id: 99, name: "Any" });
		});

		it("should reject with error", async () => {
			broker.test.mockAction("users.get").rejectWith(new Error("User not found"));

			await expect(
				broker.call("posts.get", { id: 1 })
			).rejects.toThrow("User not found");
		});

		it("should get all captured calls", async () => {
			broker.test.mockAction("users.get").returnValue({ id: 1 });
			await broker.call("posts.get", { id: 1 });

			const all = broker.test.getCalls();
			expect(all.length).toBeGreaterThanOrEqual(1);

			const userCalls = broker.test.getCalls("users.get");
			expect(userCalls.length).toBe(1);
		});

		it("should clearAll including events", () => {
			broker.emit("test.event", {});
			broker.test.mockAction("test.action").returnValue("ok");

			broker.test.clearAll();

			expect(broker.test.eventEmitted("test.event")).toBe(false);
			expect(broker.test.actionCalled("test.action")).toBe(false);
		});
	});

	describe("exports", () => {
		it("should export Testing from main module", () => {
			expect(Testing).toBeDefined();
			expect(Testing.createBroker).toBeInstanceOf(Function);
			expect(Testing.EventCatcher).toBeInstanceOf(Function);
			expect(Testing.MockingCalls).toBeInstanceOf(Function);
		});

		it("should export middlewares that can be used standalone", () => {
			const catcher = EventCatcher();
			expect(catcher.name).toBe("EventCatcher");
			expect(catcher.emit).toBeInstanceOf(Function);
			expect(catcher.broadcast).toBeInstanceOf(Function);
			expect(catcher.broadcastLocal).toBeInstanceOf(Function);
		});

		it("should export MockingCalls that can be used standalone", () => {
			const mocker = MockingCalls();
			expect(mocker.name).toBe("MockingCalls");
			expect(mocker.call).toBeInstanceOf(Function);
		});
	});
});
