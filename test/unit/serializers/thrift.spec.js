"use strict";

const { cloneDeep } = require("lodash");
const ThriftSerializer = require("../../../src/serializers/thrift");
const P = require("../../../src/packets");

describe("Test ThriftSerializer constructor", () => {
	it("should create an empty options", () => {
		let serializer = new ThriftSerializer();
		expect(serializer).toBeDefined();
		expect(serializer.serialize).toBeDefined();
		expect(serializer.deserialize).toBeDefined();
	});
});

describe("Test ProtoBuf serializer", () => {

	const serializer = new ThriftSerializer();
	serializer.init();

	it("should serialize the disconnect packet", () => {
		const obj = {
			ver: "3",
			sender: "test-1",
		};
		const s = serializer.serialize(obj, P.PACKET_DISCONNECT);
		expect(s.length).toBe(22);

		const res = serializer.deserialize(s, P.PACKET_DISCONNECT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize the heartbeat packet", () => {
		const obj = {
			ver: "3",
			sender: "test-1",
			cpu: 12.5
		};
		const s = serializer.serialize(obj, P.PACKET_HEARTBEAT);
		expect(s.length).toBe(33);

		const res = serializer.deserialize(s, P.PACKET_HEARTBEAT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize the discover packet", () => {
		const obj = {
			ver: "3",
			sender: "test-1",
		};
		const s = serializer.serialize(obj, P.PACKET_DISCOVER);
		expect(s.length).toBe(22);

		const res = serializer.deserialize(s, P.PACKET_DISCOVER);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize the info packet", () => {
		const obj = {
			ver: "3",
			sender: "test-1",
			services: [
				{ name: "users", version: "2", settings: {}, metadata: {}, actions: {
					"users.create": {}
				}, events: {
					"user.created": {}
				} }
			],
			config: {},
			ipList: [ "127.0.0.1" ],
			hostname: "test-server",
			client: {
				type: "nodejs",
				version: "1.2.3",
				langVersion: "6.10.2",
			},
			seq: 3
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_INFO);
		expect(s.length).toBe(245);

		const res = serializer.deserialize(s, P.PACKET_INFO);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);

	});

	it("should serialize the event packet", () => {
		const obj = {
			ver: "3",
			sender: "test-1",
			event: "user.created",
			data: {
				a: 5,
				b: "Test"
			},
			broadcast: true
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_EVENT);
		expect(s.length).toBe(70);

		const res = serializer.deserialize(s, P.PACKET_EVENT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(Object.assign(obj, { groups: null }));
	});

	it("should serialize the event packet with groups", () => {
		const obj = {
			ver: "3",
			sender: "test-1",
			event: "user.created",
			data: {
				a: 5,
				b: "Test"
			},
			groups: ["users", "payments"],
			broadcast: false
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_EVENT);
		expect(s.length).toBe(99);

		const res = serializer.deserialize(s, P.PACKET_EVENT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize the event packet null data", () => {
		const obj = {
			ver: "3",
			sender: "test-1",
			event: "user.created",
			data: null,
			broadcast: true
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_EVENT);
		expect(s.length).toBe(56);

		const res = serializer.deserialize(s, P.PACKET_EVENT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(Object.assign(obj, { groups: null }));
	});

	it("should serialize the event packet without data", () => {
		const obj = {
			ver: "3",
			sender: "test-1",
			event: "user.created",
			broadcast: true
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_EVENT);
		expect(s.length).toBe(45);

		const res = serializer.deserialize(s, P.PACKET_EVENT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(Object.assign(obj, { data: null, groups: null }));
	});

	it("should serialize the request packet", () => {
		const obj = {
			ver: "3",
			sender: "test-1",
			id: "100",
			action: "posts.find",
			params: { id: 5 },
			meta: {
				user: {
					id: 1,
					roles: [ "admin" ]
				}
			},
			timeout: 1500,
			level: 4,
			metrics: true,
			parentID: "999",
			requestID: "12345",
			stream: false
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_REQUEST);
		expect(s.length).toBe(154);

		const res = serializer.deserialize(s, P.PACKET_REQUEST);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize the request packet with buffer", () => {
		const obj = {
			ver: "3",
			sender: "test-1",
			id: "100",
			action: "posts.find",
			params: Buffer.from("binary data"),
			meta: {
				user: {
					id: 1,
					roles: [ "admin" ]
				}
			},
			timeout: 1500,
			level: 4,
			metrics: true,
			parentID: "999",
			requestID: "12345",
			stream: true
		};

		const s = serializer.serialize(cloneDeep(obj), P.PACKET_REQUEST);
		expect(s.length).toBe(157);

		const res = serializer.deserialize(s, P.PACKET_REQUEST);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize the response packet with data", () => {
		const obj = {
			ver: "3",
			sender: "test-1",
			id: "12345",
			success: true,
			data: [
				{ id: 1, name: "John" },
				{ id: 2, name: "Jane" }
			],
			meta: {
				user: {
					id: 1,
					roles: [ "admin" ]
				}
			},
			stream: false
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_RESPONSE);
		expect(s.length).toBe(138);

		const res = serializer.deserialize(s, P.PACKET_RESPONSE);
		expect(res).not.toBe(obj);
		expect(res).toEqual(Object.assign(obj, { error: null }));
	});

	it("should serialize the response packet with falsy data", () => {
		const obj = {
			ver: "3",
			sender: "test-1",
			id: "12345",
			success: true,
			data: false,
			meta: {},
			stream: false
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_RESPONSE);
		expect(s.length).toBe(63);

		const res = serializer.deserialize(s, P.PACKET_RESPONSE);
		expect(res).not.toBe(obj);
		expect(res).toEqual(Object.assign(obj, { error: null }));
	});

	it("should serialize the response packet with buffer data", () => {
		const obj = {
			ver: "3",
			sender: "test-1",
			id: "12345",
			success: true,
			data: Buffer.from("binary data"),
			meta: {
				user: {
					id: 1,
					roles: [ "admin" ]
				}
			},
			stream: true
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_RESPONSE);
		expect(s.length).toBe(102);

		const res = serializer.deserialize(s, P.PACKET_RESPONSE);
		expect(res).not.toBe(obj);
		expect(res).toEqual(Object.assign(obj, { error: null }));
	});

	it("should serialize the response packet with null data", () => {
		const obj = {
			ver: "3",
			sender: "test-1",
			id: "12345",
			success: true,
			data: null,
			meta: {},
			stream: false
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_RESPONSE);
		expect(s.length).toBe(51);

		const res = serializer.deserialize(s, P.PACKET_RESPONSE);
		expect(res).not.toBe(obj);
		expect(res).toEqual(Object.assign(obj, { error: null }));
	});

	it("should serialize the response packet with error", () => {
		const obj = {
			ver: "3",
			sender: "test-1",
			id: "12345",
			success: false,
			error: {
				name: "ValidationError",
				message: "Invalid email!",
				code: 422,
				nodeID: "test-1",
				type: "ERR_INVALID_A",
				retryable: true,
				stack: "STACK_PLACEHOLDER",
				data: {
					a: 5
				},
			},
			meta: {
				user: {
					id: 1,
					roles: [ "admin" ]
				}
			},
			stream: false
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_RESPONSE);
		expect(s.length).toBe(256);

		const res = serializer.deserialize(s, P.PACKET_RESPONSE);
		expect(res).not.toBe(obj);
		expect(res).toEqual(Object.assign(obj, { data: null }));
	});

	it("should serialize the ping packet", () => {
		const obj = {
			ver: "3",
			sender: "test-1",
			time: 1234567
		};
		const s = serializer.serialize(obj, P.PACKET_PING);
		expect(s.length).toBe(33);

		const res = serializer.deserialize(s, P.PACKET_PING);
		expect(res).not.toBe(obj);
		expect(res).toEqual(Object.assign(obj, {
			time: { buffer: Buffer.from([0, 0, 0, 0, 0, 18, 214, 135]), offset: 0 }
		}));
	});

	it("should serialize the pong packet", () => {
		const obj = {
			ver: "3",
			sender: "test-1",
			time: 1234567,
			arrived: 7654321,
		};
		const s = serializer.serialize(obj, P.PACKET_PONG);
		expect(s.length).toBe(44);

		const res = serializer.deserialize(s, P.PACKET_PONG);
		expect(res).not.toBe(obj);
		expect(res).toEqual(Object.assign(obj, {
			time: { buffer: Buffer.from([0, 0, 0, 0, 0, 18, 214, 135]), offset: 0 },
			arrived: { buffer: Buffer.from([0, 0, 0, 0, 0, 116, 203, 177]), offset: 0 }
		}));
	});

});

describe("Test ProtoBuf serializer with Gossip packets", () => {

	const serializer = new ThriftSerializer();
	serializer.init();

	it("should serialize the hello packet", () => {
		const obj = {
			ver: "3",
			sender: "test-1",
			host: "server-host",
			port: 45450,
		};
		const s = serializer.serialize(obj, P.PACKET_GOSSIP_HELLO);
		expect(s.length).toBe(47);

		const res = serializer.deserialize(s, P.PACKET_GOSSIP_HELLO);
		expect(res).toEqual(obj);
	});

	it("should serialize the empty REQUEST packet", () => {
		const obj = {
			ver: "3",
			sender: "test-1"
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_GOSSIP_REQ);
		expect(s.length).toBe(22);

		const res = serializer.deserialize(s, P.PACKET_GOSSIP_REQ);
		expect(res).toEqual(Object.assign(obj, { offline: null, online: null }));
	});

	it("should serialize the full REQUEST packet", () => {
		const obj = {
			ver: "3",
			sender: "test-1",
			online: {
				"node-1": [1, 2, 3],
				"node-2": [150, 0, 0]
			},
			offline: {
				"node-3": 23,
				"node-4": 26854204
			}
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_GOSSIP_REQ);
		expect(s.length).toBe(104);

		const res = serializer.deserialize(s, P.PACKET_GOSSIP_REQ);
		expect(res).toEqual(obj);
	});

	it("should serialize the empty RESPONSE packet", () => {
		const obj = {
			ver: "3",
			sender: "test-1"
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_GOSSIP_RES);
		expect(s.length).toBe(22);

		const res = serializer.deserialize(s, P.PACKET_GOSSIP_RES);
		expect(res).toEqual(Object.assign(obj, { offline: null, online: null }));
	});

	it("should serialize the full RESPONSE packet", () => {
		const obj = {
			ver: "3",
			sender: "test-1",
			online: {
				"node-1": [{ services: [] }, 2, 3],
				"node-2": [13, 56]
			},
			offline: {
				"node-3": 23,
				"node-4": 26854204
			}
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_GOSSIP_RES);
		expect(s.length).toBe(116);

		const res = serializer.deserialize(s, P.PACKET_GOSSIP_RES);
		expect(res).toEqual(obj);
	});

});

