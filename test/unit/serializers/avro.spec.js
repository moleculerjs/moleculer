"use strict";

const { cloneDeep } = require("lodash");
const AvroSerializer = require("../../../src/serializers/avro");
const P = require("../../../src/packets");

describe("Test AvroSerializer constructor", () => {
	it("should create an empty options", () => {
		let serializer = new AvroSerializer();
		expect(serializer).toBeDefined();
		expect(serializer.serialize).toBeDefined();
		expect(serializer.deserialize).toBeDefined();
	});
});

describe("Test Avro serializer", () => {

	const serializer = new AvroSerializer();
	serializer.init();

	it("should serialize the disconnect packet", () => {
		const obj = {
			ver: "2",
			sender: "test-1",
		};
		const s = serializer.serialize(obj, P.PACKET_DISCONNECT);
		expect(s.length).toBe(9);

		const res = serializer.deserialize(s, P.PACKET_DISCONNECT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize the heartbeat packet", () => {
		const obj = {
			ver: "2",
			sender: "test-1",
			cpu: 12.5
		};
		const s = serializer.serialize(obj, P.PACKET_HEARTBEAT);
		expect(s.length).toBe(17);

		const res = serializer.deserialize(s, P.PACKET_HEARTBEAT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize the discover packet", () => {
		const obj = {
			ver: "2",
			sender: "test-1",
		};
		const s = serializer.serialize(obj, P.PACKET_DISCOVER);
		expect(s.length).toBe(9);

		const res = serializer.deserialize(s, P.PACKET_DISCOVER);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize the info packet", () => {
		const obj = {
			ver: "2",
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
			instanceID: "123456",
			hostname: "test-server",
			client: {
				type: "nodejs",
				version: "1.2.3",
				langVersion: "6.10.2",
			},
			metadata: {
				region: "eu-west1"
			},
			seq: 3
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_INFO);
		expect(s.length).toBe(207);

		const res = serializer.deserialize(s, P.PACKET_INFO);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);

	});

	it("should serialize the event packet", () => {
		const obj = {
			ver: "2",
			sender: "test-1",
			id: "event-id",
			event: "user.created",
			data: {
				a: 5,
				b: "Test"
			},
			broadcast: true,
			meta: { name: "John" },
			level: 5,
			tracing: true,
			parentID: "parent-id",
			requestID: "request-id",
			caller: "posts.created",
			needAck: true
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_EVENT);
		expect(s.length).toBe(115);

		const res = serializer.deserialize(s, P.PACKET_EVENT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(Object.assign(obj, { groups: null, seq: null, stream: null }));
	});

	it("should serialize the event packet with groups", () => {
		const obj = {
			ver: "2",
			sender: "test-1",
			id: "event-id",
			event: "user.created",
			data: {
				a: 5,
				b: "Test"
			},
			groups: ["users", "payments"],
			broadcast: false,
			meta: { name: "John" },
			level: 5,
			tracing: true,
			parentID: "parent-id",
			requestID: "request-id",
			caller: "posts.created",
			needAck: true
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_EVENT);
		expect(s.length).toBe(132);

		const res = serializer.deserialize(s, P.PACKET_EVENT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(Object.assign(obj, { seq: null, stream: null }));
	});

	it("should serialize the event packet null data", () => {
		const obj = {
			ver: "3",
			sender: "test-1",
			id: "event-id",
			event: "user.created",
			data: null,
			broadcast: true,
			meta: { name: "John" },
			level: 5,
			tracing: true,
			parentID: "parent-id",
			requestID: "request-id",
			caller: "posts.created",
			needAck: true
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_EVENT);
		expect(s.length).toBe(96);

		const res = serializer.deserialize(s, P.PACKET_EVENT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(Object.assign(obj, { groups: null, seq: null, stream: null }));
	});

	it("should serialize the event packet without data", () => {
		const obj = {
			ver: "2",
			sender: "test-1",
			id: "event-id",
			event: "user.created",
			broadcast: true,
			meta: { name: "John" },
			level: 5,
			tracing: true,
			parentID: "parent-id",
			requestID: "request-id",
			caller: "posts.created",
			needAck: true
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_EVENT);
		expect(s.length).toBe(96);

		const res = serializer.deserialize(s, P.PACKET_EVENT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(Object.assign(obj, { groups: null, seq: null, stream: null }));
	});

	it("should serialize the request packet", () => {
		const obj = {
			ver: "2",
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
			tracing: true,
			parentID: "999",
			requestID: "12345",
			caller: "users.list",
			stream: false,
			seq: null
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_REQUEST);
		expect(s.length).toBe(110);

		const res = serializer.deserialize(s, P.PACKET_REQUEST);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize the request packet without params", () => {
		const obj = {
			ver: "2",
			sender: "test-1",
			id: "100",
			action: "posts.find",
			params: null,
			meta: {
				user: {
					id: 1,
					roles: [ "admin" ]
				}
			},
			timeout: 1500,
			level: 4,
			tracing: true,
			parentID: "999",
			requestID: "12345",
			caller: "users.list",
			stream: false,
			seq: null
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_REQUEST);
		expect(s.length).toBe(101);

		const res = serializer.deserialize(s, P.PACKET_REQUEST);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize the request packet with buffer", () => {
		const obj = {
			ver: "2",
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
			tracing: true,
			parentID: "999",
			requestID: "12345",
			caller: null,
			stream: true,
			seq: 6
		};

		const s = serializer.serialize(cloneDeep(obj), P.PACKET_REQUEST);
		expect(s.length).toBe(103);

		const res = serializer.deserialize(s, P.PACKET_REQUEST);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize the response packet with data", () => {
		const obj = {
			ver: "2",
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
			stream: false,
			seq: null
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_RESPONSE);
		expect(s.length).toBe(106);

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
			stream: false,
			seq: 3
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_RESPONSE);
		expect(s.length).toBe(32);

		const res = serializer.deserialize(s, P.PACKET_RESPONSE);
		expect(res).not.toBe(obj);
		expect(res).toEqual(Object.assign(obj, { error: null }));
	});

	it("should serialize the response packet with buffer data", () => {
		const obj = {
			ver: "2",
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
			stream: true,
			seq: 6
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_RESPONSE);
		expect(s.length).toBe(71);

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
			stream: false,
			seq: 3,
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_RESPONSE);
		expect(s.length).toBe(26);

		const res = serializer.deserialize(s, P.PACKET_RESPONSE);
		expect(res).not.toBe(obj);
		expect(res).toEqual(Object.assign(obj, { error: null }));
	});

	it("should serialize the response packet with error", () => {
		const obj = {
			ver: "2",
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
			stream: false,
			seq: null
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_RESPONSE);
		expect(s.length).toBe(225);

		const res = serializer.deserialize(s, P.PACKET_RESPONSE);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize the ping packet", () => {
		const obj = {
			ver: "2",
			sender: "test-1",
			id: "123",
			time: 1234567
		};
		const s = serializer.serialize(obj, P.PACKET_PING);
		expect(s.length).toBe(18);

		const res = serializer.deserialize(s, P.PACKET_PING);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize the pong packet", () => {
		const obj = {
			ver: "2",
			sender: "test-1",
			time: 1234567,
			id: "123",
			arrived: 7654321,
		};
		const s = serializer.serialize(obj, P.PACKET_PONG);
		expect(s.length).toBe(22);

		const res = serializer.deserialize(s, P.PACKET_PONG);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

});

describe("Test Avro serializer with Gossip packets", () => {

	const serializer = new AvroSerializer();
	serializer.init();

	it("should serialize the hello packet", () => {
		const obj = {
			ver: "2",
			sender: "test-1",
			host: "server-host",
			port: 45450,
		};
		const s = serializer.serialize(obj, P.PACKET_GOSSIP_HELLO);
		expect(s.length).toBe(24);

		const res = serializer.deserialize(s, P.PACKET_GOSSIP_HELLO);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize the empty REQUEST packet", () => {
		const obj = {
			ver: "2",
			sender: "test-1"
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_GOSSIP_REQ);
		expect(s.length).toBe(11);

		const res = serializer.deserialize(s, P.PACKET_GOSSIP_REQ);
		expect(res).not.toBe(obj);
		expect(res).toEqual(Object.assign(obj, { online: null, offline: null }));
	});

	it("should serialize the full REQUEST packet", () => {
		const obj = {
			ver: "2",
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
		expect(s.length).toBe(81);

		const res = serializer.deserialize(s, P.PACKET_GOSSIP_REQ);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize the empty RESPONSE packet", () => {
		const obj = {
			ver: "2",
			sender: "test-1"
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_GOSSIP_RES);
		expect(s.length).toBe(11);

		const res = serializer.deserialize(s, P.PACKET_GOSSIP_RES);
		expect(res).not.toBe(obj);
		expect(res).toEqual(Object.assign(obj, { online: null, offline: null }));
	});

	it("should serialize the full RESPONSE packet", () => {
		const obj = {
			ver: "2",
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
		expect(s.length).toBe(93);

		const res = serializer.deserialize(s, P.PACKET_GOSSIP_RES);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

});
