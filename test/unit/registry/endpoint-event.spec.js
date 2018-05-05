"use strict";

let EventEndpoint = require("../../../src/registry/endpoint-event");
let ServiceBroker = require("../../../src/service-broker");

describe("Test EventEndpoint", () => {

	let broker = new ServiceBroker({ logger: false });
	let registry = broker.registry;

	let node = { id: "server-1" };
	let service = { name: "test" };
	let event = { name: "test.hello" };
	let ep;

	it("should set properties", () => {
		ep = new EventEndpoint(registry, broker, node, service, event);

		expect(ep).toBeDefined();
		expect(ep.registry).toBe(registry);
		expect(ep.broker).toBe(broker);
		expect(ep.node).toBe(node);
		expect(ep.service).toBe(service);
		expect(ep.event).toBe(event);

		expect(ep.isAvailable).toBe(true);
	});

	it("shoud update event", () => {
		let newEvent = { name: "test.hello2" };

		ep.update(newEvent);

		expect(ep.event).toBe(newEvent);
	});
});
