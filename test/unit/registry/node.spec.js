"use strict";

let cpuUsage = jest.mock("../../../src/cpu-usage", () => () => Promise.resolve({ avg: 12 }));

let Node = require("../../../src/registry/node");

describe("Test Node", () => {

	it("should create a new Node", () => {
		let node = new Node("node-1");

		expect(node).toBeDefined();
		expect(node.id).toBe("node-1");
		expect(node.available).toBe(true);
		expect(node.local).toBe(false);
		expect(node.lastHeartbeatTime).toBeDefined();
		expect(node.config).toEqual({});
		expect(node.client).toEqual({});

		expect(node.ipList).toBeNull();
		expect(node.port).toBeNull();
		expect(node.hostname).toBeNull();
		expect(node.rawInfo).toBeNull();
		expect(node.services).toEqual([]);

		expect(node.cpu).toBeNull();
		expect(node.cpuWhen).toBeNull();
		expect(node.when).toBeNull();
		expect(node.offlineSince).toBeNull();
	});

	describe("Test update", () => {
		let node = new Node("node-1");

		it("should update props", () => {
			let payload = {
				ipList: ["127.0.0.1"],
				hostname: "host",
				port: 1234,
				client: {},
				services: [{}],
				when: 1234567
			};
			node.update(payload);

			expect(node.ipList).toBe(payload.ipList);
			expect(node.client).toBe(payload.client);
			expect(node.hostname).toBe("host");
			expect(node.port).toBe(1234);

			expect(node.services).toBe(payload.services);
			expect(node.rawInfo).toBe(payload);

			expect(node.when).toBe(1234567);
		});

		it("should update when if later", () => {
			let payload = {
				when: 1234580
			};
			node.update(payload);

			expect(node.when).toBe(1234580);
		});

		it("should update when if earlier", () => {
			let payload = {
				when: 1234500
			};
			node.update(payload);

			expect(node.when).toBe(1234580);
		});
	});

	it("should update local info", () => {
		let node = new Node("node-1");
		node.cpuWhen = 1000;

		return node.updateLocalInfo().then(() => {
			expect(node.cpu).toBe(12);
			expect(node.cpuWhen).not.toBe(1000);
		});
	});

	it("should update heartbeat props", () => {
		let node = new Node("node-1");
		node.available = false;
		node.offlineSince = Date.now();
		let oldWhen = node.when;

		let payload = {
			cpu: 56.8,
			cpuWhen: 12345678
		};
		node.heartbeat(payload);

		expect(node.cpu).toBe(56.8);
		expect(node.cpuWhen).toBe(12345678);
		expect(node.available).toBe(true);
		expect(node.offlineSince).toBeNull();
		expect(node.when).not.toBe(oldWhen);
		expect(node.lastHeartbeatTime).toBeDefined();
	});

	it("should set unavailable", () => {
		let node = new Node("node-1");
		node.when = 123456;
		node.available = true;
		node.offlineSince = null;
		let oldWhen = node.when;

		node.disconnected();

		expect(node.available).toBe(false);
		expect(node.offlineSince).toBeDefined();
		expect(node.when).not.toBe(oldWhen);
	});

});
