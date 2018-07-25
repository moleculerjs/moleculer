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
		expect(node.config).toEqual({});
		expect(node.client).toEqual({});

		expect(node.ipList).toBeNull();
		expect(node.port).toBeNull();
		expect(node.hostname).toBeNull();
		expect(node.rawInfo).toBeNull();
		expect(node.services).toEqual([]);

		expect(node.cpu).toBeNull();
		expect(node.cpuSeq).toBeNull();
		expect(node.seq).toBe(0);
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
				seq: 6
			};
			node.update(payload);

			expect(node.ipList).toBe(payload.ipList);
			expect(node.client).toBe(payload.client);
			expect(node.hostname).toBe("host");
			expect(node.port).toBe(1234);

			expect(node.services).toBe(payload.services);
			expect(node.rawInfo).toBe(payload);

			expect(node.seq).toBe(6);
		});

		it("should update 'seq' if later", () => {
			let payload = {
				seq: 8
			};
			node.update(payload);

			expect(node.seq).toBe(8);
		});

		it("should not update 'seq' if earlier", () => {
			let payload = {
				seq: 7
			};
			node.update(payload);

			expect(node.seq).toBe(8);
		});

		it("should update 'seq' if reconnected", () => {
			let payload = {
				seq: 2
			};
			node.update(payload, true);

			expect(node.seq).toBe(2);
		});
	});

	it("should update local info", () => {
		let node = new Node("node-1");
		node.cpuSeq = 1000;

		const cpu = jest.fn(() => Promise.resolve({ avg: 12 }));

		return node.updateLocalInfo(cpu).then(() => {
			expect(node.cpu).toBe(12);
			expect(node.cpuSeq).not.toBe(1000);

			expect(cpu).toHaveBeenCalledTimes(1);
			expect(cpu).toHaveBeenCalledWith();
		});
	});

	it("should update heartbeat props", () => {
		let node = new Node("node-1");
		node.available = false;
		node.offlineSince = Date.now();
		node.seq = 5;

		let payload = {
			cpu: 56.8,
			cpuSeq: 12345678
		};
		node.heartbeat(payload);

		expect(node.cpu).toBe(56.8);
		expect(node.cpuSeq).toBe(12345678);
		expect(node.available).toBe(true);
		expect(node.offlineSince).toBeNull();
		expect(node.seq).toBe(5);
		expect(node.lastHeartbeatTime).toBeDefined();
	});

	it("should set unavailable", () => {
		let node = new Node("node-1");
		node.seq = 5;
		node.available = true;
		node.offlineSince = null;

		node.disconnected();

		expect(node.available).toBe(false);
		expect(node.offlineSince).toBeDefined();
		expect(node.seq).toBe(6);

		// Should not increment seq again
		node.disconnected();

		expect(node.available).toBe(false);
		expect(node.offlineSince).toBeDefined();
		expect(node.seq).toBe(6);
	});

});
