"use strict";

let Endpoint = require("../../../src/registry/endpoint");
let ServiceBroker = require("../../../src/service-broker");

describe("Test Endpoint", () => {
	let broker = new ServiceBroker({ logger: false });
	let registry = broker.registry;

	let node = { id: "server-1" };
	let ep;

	it("should set properties", () => {
		ep = new Endpoint(registry, broker, node);

		expect(ep).toBeDefined();
		expect(ep.registry).toBe(registry);
		expect(ep.broker).toBe(broker);
		expect(ep.id).toBe(node.id);
		expect(ep.node).toBe(node);
		expect(ep.local).toBe(false);
		expect(ep.state).toBe(true);

		expect(ep.isAvailable).toBe(true);
	});

	it("shoud unAvailable", () => {
		ep.state = false;
		expect(ep.isAvailable).toBe(false);
	});

	it("should create local ep", () => {
		let newNode = { id: broker.nodeID };
		let ep = new Endpoint(registry, broker, newNode);

		expect(ep).toBeDefined();
		expect(ep.registry).toBe(registry);
		expect(ep.broker).toBe(broker);
		expect(ep.id).toBe(newNode.id);
		expect(ep.node).toBe(newNode);
		expect(ep.local).toBe(true);
		expect(ep.state).toBe(true);

		expect(ep.isAvailable).toBe(true);
	});
});
