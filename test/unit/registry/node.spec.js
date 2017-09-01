"use strict";

let Node = require("../../../src/registry/node");

describe("Test Node", () => {

	it("should create a new Node", () => {
		let node = new Node("node-1");

		expect(node).toBeDefined();
		expect(node.id).toBe("node-1");
		expect(node.available).toBe(true);
		expect(node.local).toBe(false);
		expect(node.lastHeartbeatTime).toBeDefined();
		expect(node.cpu).toBeNull();
		expect(node.config).toEqual({});
		expect(node.port).toBeNull();
		expect(node.ipList).toBeNull();
		expect(node.client).toBeNull();
		expect(node.services).toBeNull();
		expect(node.events).toBeNull();
	});

	it("should update props", () => {
		let node = new Node("node-1");

		let payload = {
			ipList: ["127.0.0.1"],
			client: {},
			services: [],
			events: []
		};
		node.update(payload);

		expect(node.ipList).toBe(payload.ipList);
		expect(node.client).toBe(payload.client);
		expect(node.services).toBe(payload.services);
		expect(node.events).toBe(payload.events);
	});

	it("should update heartbeat props", () => {
		let node = new Node("node-1");
		node.available = false;

		let payload = {
			cpu: 56.8
		};
		node.heartbeat(payload);

		expect(node.cpu).toBe(56.8);
		expect(node.available).toBe(true);
		expect(node.lastHeartbeatTime).toBeDefined();
	});

	it("should set unavailable", () => {
		let node = new Node("node-1");
		node.available = true;

		node.disconnected();

		expect(node.available).toBe(false);
	});

});
