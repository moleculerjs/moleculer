"use strict";

const ServiceBroker = require("../../src/service-broker");

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// "*" in an event name matches any characters except a dot, "**" matches dots as well.
// So a service subscribed to "order*" must receive "orderCreated" but never "order.created".
describe("Test event wildcard subscriptions ('prefix*' vs. dotted event names)", () => {
	let flow = [];

	const createListenerServices = broker => {
		broker.createService({
			name: "orderStar",
			events: {
				"order*"(ctx) {
					flow.push(`${this.broker.nodeID}:order*:${ctx.eventName}`);
				}
			}
		});
		broker.createService({
			name: "orderDotStar",
			events: {
				"order.*"(ctx) {
					flow.push(`${this.broker.nodeID}:order.*:${ctx.eventName}`);
				}
			}
		});
		broker.createService({
			name: "orderDoubleStar",
			events: {
				"order**"(ctx) {
					flow.push(`${this.broker.nodeID}:order**:${ctx.eventName}`);
				}
			}
		});
	};

	const listener = new ServiceBroker({
		namespace: "event-wildcard",
		nodeID: "listener",
		transporter: "Fake",
		logger: false
	});
	createListenerServices(listener);

	const emitter = new ServiceBroker({
		namespace: "event-wildcard",
		nodeID: "emitter",
		transporter: "Fake",
		logger: false
	});

	beforeAll(async () => {
		await Promise.all([listener.start(), emitter.start()]);
		await emitter.waitForServices(["orderStar", "orderDotStar", "orderDoubleStar"]);
	});

	afterAll(() => Promise.all([listener.stop(), emitter.stop()]));

	beforeEach(() => (flow = []));

	const sorted = arr => [...arr].sort();

	describe("emitted from a remote node", () => {
		it("should not deliver 'order.created' to the 'order*' subscriber", async () => {
			await emitter.emit("order.created", { id: 1 });
			await wait(50);

			expect(sorted(flow)).toEqual(
				sorted(["listener:order.*:order.created", "listener:order**:order.created"])
			);
		});

		it("should deliver 'orderCreated' to the 'order*' subscriber", async () => {
			await emitter.emit("orderCreated", { id: 2 });
			await wait(50);

			expect(sorted(flow)).toEqual(
				sorted(["listener:order*:orderCreated", "listener:order**:orderCreated"])
			);
		});

		it("should not broadcast 'order.created' to the 'order*' subscriber", async () => {
			await emitter.broadcast("order.created", { id: 3 });
			await wait(50);

			expect(sorted(flow)).toEqual(
				sorted(["listener:order.*:order.created", "listener:order**:order.created"])
			);
		});

		it("should not list the 'order*' group for 'order.created' in the emitter's registry", () => {
			expect(sorted(emitter.registry.events.getGroups("order.created"))).toEqual(
				sorted(["orderDotStar", "orderDoubleStar"])
			);
			expect(sorted(emitter.registry.events.getGroups("orderCreated"))).toEqual(
				sorted(["orderStar", "orderDoubleStar"])
			);
		});
	});

	describe("emitted on the local node", () => {
		it("should not deliver 'order.created' to the 'order*' subscriber", async () => {
			await listener.emit("order.created", { id: 4 });
			await wait(50);

			expect(sorted(flow)).toEqual(
				sorted(["listener:order.*:order.created", "listener:order**:order.created"])
			);
		});

		it("should deliver 'orderCreated' to the 'order*' subscriber", async () => {
			await listener.emit("orderCreated", { id: 5 });
			await wait(50);

			expect(sorted(flow)).toEqual(
				sorted(["listener:order*:orderCreated", "listener:order**:orderCreated"])
			);
		});

		it("should not broadcastLocal 'order.created' to the 'order*' subscriber", async () => {
			await listener.broadcastLocal("order.created", { id: 6 });
			await wait(50);

			expect(sorted(flow)).toEqual(
				sorted(["listener:order.*:order.created", "listener:order**:order.created"])
			);
		});
	});
});
