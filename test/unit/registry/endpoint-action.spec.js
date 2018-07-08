"use strict";

let ActionEndpoint = require("../../../src/registry/endpoint-action");
let ServiceBroker = require("../../../src/service-broker");

describe("Test ActionEndpoint", () => {

	let broker = new ServiceBroker({ logger: false });
	let registry = broker.registry;

	let node = { id: "server-1" };
	let service = { name: "test" };
	let action = { name: "test.hello" };
	let ep;

	it("should set properties", () => {
		ep = new ActionEndpoint(registry, broker, node, service, action);

		expect(ep).toBeDefined();
		expect(ep.registry).toBe(registry);
		expect(ep.broker).toBe(broker);
		expect(ep.node).toBe(node);
		expect(ep.service).toBe(service);
		expect(ep.action).toBe(action);

		expect(ep.isAvailable).toBe(true);
	});

	it("shoud update action", () => {
		let newAction = { name: "test.hello2" };

		ep.update(newAction);

		expect(ep.action).toBe(newAction);
	});
});
