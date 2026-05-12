"use strict";

const { ServiceBroker, Testing } = require("../..");

describe("Test Testing helpers", () => {
	/** @type {import("../../src/testing").TestingBroker} */
	let broker;

	afterEach(async () => {
		if (broker) {
			await broker.stop();
			broker = null;
		}
	});

	it("should create a quiet test broker with testing helpers", () => {
		broker = Testing.createBroker();

		expect(broker).toBeInstanceOf(ServiceBroker);
		expect(broker.options.logger).toBe(false);
		expect(broker.options.test).toBe(true);
		expect(broker.events).toBeDefined();
		expect(broker.mockAction).toBeInstanceOf(Function);
	});

	it("should register mock services", async () => {
		broker = Testing.createBroker({
			mockServices: {
				greeter: {
					actions: {
						hello(ctx) {
							return `Hello ${ctx.params.name}`;
						}
					}
				}
			}
		});

		await broker.start();

		await expect(broker.call("greeter.hello", { name: "Ada" })).resolves.toBe("Hello Ada");
	});

	it("should mock dependent action calls and keep call history", async () => {
		broker = Testing.createBroker({
			mockServices: {
				posts: {
					actions: {
						async list() {
							return this.broker.call("users.list", { active: true });
						}
					}
				}
			}
		});

		broker.mockAction("users.list", params => [{ id: 1, active: params.active }]);

		await broker.start();

		await expect(broker.call("posts.list")).resolves.toEqual([{ id: 1, active: true }]);
		expect(broker.getMockedActionCalls("users.list")).toEqual([
			expect.objectContaining({
				actionName: "users.list",
				params: { active: true },
				result: [{ id: 1, active: true }]
			})
		]);
	});

	it("should capture emitted events and wait for matching events", async () => {
		broker = Testing.createBroker({
			mockServices: {
				users: {
					actions: {
						create(ctx) {
							this.broker.emit("user.created", { id: ctx.params.id });
							return true;
						}
					}
				}
			}
		});

		await broker.start();
		broker.events.clear();

		const waited = broker.events.waitFor("user.created");
		await broker.call("users.create", { id: 5 });

		await expect(waited).resolves.toEqual(
			expect.objectContaining({
				name: "user.created",
				payload: { id: 5 },
				type: "emit"
			})
		);
		expect(broker.events.getEvents()).toHaveLength(1);
	});

	it("should clear mocks and captured events", async () => {
		broker = Testing.createBroker();
		broker.mockAction("users.list", []);

		await broker.start();
		broker.events.clear();

		await broker.call("users.list");
		broker.emit("user.created", { id: 1 });

		expect(broker.getMockedActionCalls()).toHaveLength(1);
		expect(broker.events.getEvents()).toHaveLength(1);

		broker.clearActionMocks();
		broker.events.clear();

		expect(broker.getMockedActionCalls()).toHaveLength(0);
		expect(broker.events.getEvents()).toHaveLength(0);
	});
});
