const Context = require("../../src/context");
const { ValidationError } = require("../../src/errors");

const P = require("../../src/packets");

describe("Test base Packet", () => {

	const transit = {
		nodeID: "node-1",
		serialize: jest.fn(),
		deserialize: jest.fn(msg => JSON.parse(msg))
	};

	it("create Packet without type", () => {
		let packet = new P.Packet(transit);
		expect(packet).toBeDefined();
		expect(packet.transit).toBe(transit);
		expect(packet.type).toBe(P.PACKET_UNKNOW);
		expect(packet.target).toBeUndefined();
		expect(packet.payload).toBeDefined();
		expect(packet.payload.sender).toBe("node-1");
	});

	it("create Packet with type & target", () => {
		let packet = new P.Packet(transit, P.PACKET_EVENT, "node-2");
		expect(packet).toBeDefined();
		expect(packet.transit).toBe(transit);
		expect(packet.type).toBe(P.PACKET_EVENT);
		expect(packet.target).toBe("node-2");
		expect(packet.payload).toBeDefined();
		expect(packet.payload.sender).toBe("node-1");
	});

	it("should call transit.serialize", () => {
		transit.serialize.mockClear();

		let packet = new P.Packet(transit, P.PACKET_EVENT, "node-2");
		packet.serialize();
		expect(transit.serialize).toHaveBeenCalledTimes(1);
		expect(transit.serialize).toHaveBeenCalledWith(packet.payload, P.PACKET_EVENT);
	});

	it("should set payload", () => {
		let packet = new P.Packet(transit, P.PACKET_EVENT, "node-2");
		let obj = { a: 5 };
		packet.transformPayload(obj);
		expect(packet.payload).toBe(obj);
	});

	it("should return a Packet instance", () => {
		transit.deserialize.mockClear();

		let packet = P.Packet.deserialize(transit, P.PACKET_HEARTBEAT, '{"a": 5}');
		expect(packet).toBeInstanceOf(P.PacketHeartbeat);
		expect(packet.payload).toEqual({ a: 5 });
		expect(transit.deserialize).toHaveBeenCalledTimes(1);
		expect(transit.deserialize).toHaveBeenCalledWith('{"a": 5}', P.PACKET_HEARTBEAT);
	});

});

describe("Test PacketDisconnect", () => {

	const transit = { nodeID: "node-1" };

	it("should set properties", () => {
		let packet = new P.PacketDisconnect(transit);
		expect(packet).toBeDefined();
		expect(packet.type).toBe(P.PACKET_DISCONNECT);
		expect(packet.target).toBeUndefined();
		expect(packet.payload).toBeDefined();
		expect(packet.payload.sender).toBe("node-1");
	});

});

describe("Test PacketHeartbeat", () => {

	const transit = { nodeID: "node-1" };

	it("should set properties", () => {
		let packet = new P.PacketHeartbeat(transit);
		expect(packet).toBeDefined();
		expect(packet.type).toBe(P.PACKET_HEARTBEAT);
		expect(packet.target).toBeUndefined();
		expect(packet.payload).toBeDefined();
		expect(packet.payload.sender).toBe("node-1");
	});

});

describe("Test PacketDiscover", () => {

	const transit = { nodeID: "node-1" };

	it("should set properties", () => {
		let packet = new P.PacketDiscover(transit);
		expect(packet).toBeDefined();
		expect(packet.type).toBe(P.PACKET_DISCOVER);
		expect(packet.target).toBeUndefined();
		expect(packet.payload).toEqual({ sender: "node-1" });
	});

});

describe("Test PacketInfo", () => {

	const transit = { nodeID: "node-1" };

	it("should set properties", () => {
		const info = {
			actions: {
				"user.find": { cache: true },
				"user.create": {}
			},
			ipList: [ "127.0.0.1" ],
			versions: {
				node: "6.10.2",
				moleculer: "1.2.3"
			},
			uptime: 100

		};
		
		let packet = new P.PacketInfo(transit, "node-2", info);
		expect(packet).toBeDefined();
		expect(packet.type).toBe(P.PACKET_INFO);
		expect(packet.target).toBe("node-2");
		expect(packet.payload).toBeDefined();
		expect(packet.payload.sender).toBe("node-1");
		expect(packet.payload.actions).toBe("{\"user.find\":{\"cache\":true},\"user.create\":{}}");
		expect(packet.payload.ipList).toEqual(info.ipList);
		expect(packet.payload.versions).toEqual(info.versions);
		expect(packet.payload.uptime).toEqual(info.uptime);		
	});

	it("should transform payload", () => {
		let payload = {
			actions: "{\"posts.find\":{}}",
			ipList: [ "127.0.0.1" ],
			versions: {
				node: "6.10.2",
				moleculer: "1.2.3"
			},
			uptime: 100
		};
		let packet = new P.PacketInfo(transit, "server-2", {});
		packet.transformPayload(payload);

		expect(packet.payload.actions).toEqual({ "posts.find": {} });
		expect(packet.payload.ipList).toEqual(payload.ipList);
		expect(packet.payload.versions).toEqual(payload.versions);
		expect(packet.payload.uptime).toEqual(payload.uptime);			
	});
});

describe("Test PacketEvent", () => {

	const transit = { nodeID: "node-1" };

	it("should set properties", () => {
		let data = { id: 5 };
		let packet = new P.PacketEvent(transit, "user.created", data);
		expect(packet).toBeDefined();
		expect(packet.type).toBe(P.PACKET_EVENT);
		expect(packet.target).toBeUndefined();
		expect(packet.payload).toBeDefined();
		expect(packet.payload.sender).toBe("node-1");
		expect(packet.payload.event).toBe("user.created");
		expect(packet.payload.data).toBe("{\"id\":5}");
	});

	it("should transform payload", () => {
		let payload = {
			data: "{\"a\":5}"
		};
		let packet = new P.PacketEvent(transit, "user.created", {});
		packet.transformPayload(payload);

		expect(packet.payload.data).toEqual({ a: 5 });
	});

	it("should convert undefined", () => {
		let packet = new P.PacketEvent(transit, "user.updated");
		expect(packet).toBeDefined();
		expect(packet.type).toBe(P.PACKET_EVENT);
		expect(packet.target).toBeUndefined();
		expect(packet.payload).toBeDefined();
		expect(packet.payload.sender).toBe("node-1");
		expect(packet.payload.event).toBe("user.updated");
		expect(packet.payload.data).toBeNull();
	});	

	it("should transform without payload", () => {
		let payload = {
			data: undefined
		};
		let packet = new P.PacketEvent(transit, "user.created", {});
		packet.transformPayload(payload);

		expect(packet.payload.data).toBeUndefined();
	});	
});

describe("Test PacketRequest", () => {

	const transit = { nodeID: "node-1" };

	it("should set properties", () => {
		let ctx = new Context();
		ctx.id = "100";
		ctx.action = {
			name: "posts.find"
		};
		// requestID: "12345",
		ctx.params = { id: 5 };
		ctx.meta = {
			user: {
				id: 1,
				roles: [ "admin" ]
			}
		};
		ctx.level = 4;
		ctx.timeout = 1500;
		ctx.retryCount = 2;
		ctx.metrics = true;
		ctx.parentID = "999";

		let packet = new P.PacketRequest(transit, "server-2", ctx);
		expect(packet).toBeDefined();
		expect(packet.type).toBe(P.PACKET_REQUEST);
		expect(packet.target).toBe("server-2");
		expect(packet.payload).toBeDefined();
		expect(packet.payload.sender).toBe("node-1");
		expect(packet.payload.id).toBe("100");
		expect(packet.payload.action).toBe("posts.find");
		expect(packet.payload.params).toBe("{\"id\":5}");
		expect(packet.payload.meta).toBe("{\"user\":{\"id\":1,\"roles\":[\"admin\"]}}");
		expect(packet.payload.timeout).toBe(1500);
		expect(packet.payload.level).toBe(4);
		expect(packet.payload.metrics).toBe(true);
		expect(packet.payload.parentID).toBe("999");
	});

	it("should transform payload", () => {
		let payload = {
			params: "{\"a\":5}",
			meta: "{\"b\":\"John\"}"
		};
		let packet = new P.PacketRequest(transit, "server-2");
		packet.transformPayload(payload);

		expect(packet.payload.params).toEqual({ a: 5 });
		expect(packet.payload.meta).toEqual({ b: "John" });
	});

});

describe("Test PacketResponse", () => {

	const transit = { nodeID: "node-1" };

	it("should set properties without error", () => {
		let data = { id: 5 };
		let packet = new P.PacketResponse(transit, "server-2", "12345", data);
		expect(packet).toBeDefined();
		expect(packet.type).toBe(P.PACKET_RESPONSE);
		expect(packet.target).toBe("server-2");
		expect(packet.payload).toBeDefined();
		expect(packet.payload.sender).toBe("node-1");
		expect(packet.payload.id).toBe("12345");
		expect(packet.payload.success).toBe(true);
		expect(packet.payload.data).toBe("{\"id\":5}");
		expect(packet.payload.error).toBeUndefined();
	});

	it("should set properties with error", () => {
		let err = new ValidationError("Validation error", "ERR_INVALID_A", { a: 5 });
		let packet = new P.PacketResponse(transit, "server-2", "12345", null, err);
		expect(packet).toBeDefined();
		expect(packet.type).toBe(P.PACKET_RESPONSE);
		expect(packet.target).toBe("server-2");
		expect(packet.payload).toBeDefined();
		expect(packet.payload.sender).toBe("node-1");
		expect(packet.payload.id).toBe("12345");
		expect(packet.payload.success).toBe(false);
		expect(packet.payload.data).toBeNull();
		expect(packet.payload.error).toBeDefined();
		expect(packet.payload.error.name).toBe("ValidationError");
		expect(packet.payload.error.message).toBe("Validation error");
		expect(packet.payload.error.code).toBe(422);
		expect(packet.payload.error.type).toBe("ERR_INVALID_A");
		expect(packet.payload.error.nodeID).toBe("node-1");
		expect(packet.payload.error.data).toBe("{\"a\":5}");
	});

	it("should transform payload without error", () => {
		let payload = {
			data: "{\"a\":5}"
		};
		let packet = new P.PacketResponse(transit, "server-2", "12345", {});
		packet.transformPayload(payload);

		expect(packet.payload.data).toEqual({ a: 5 });
		expect(packet.payload.error).toBeUndefined();		
	});

	it("should transform payload with error", () => {
		let payload = {
			data: null,
			error: {
				name: "MoleculerError",
				message: "Something happened",
				code: 500,
				type: "ERR_SOMETHING",
				nodeID: "far-far-node",
				data: "{\"a\":5}"
			}
		};
		let packet = new P.PacketResponse(transit, "server-2", "12345", {});
		packet.transformPayload(payload);

		expect(packet.payload.data).toBeNull();
		expect(packet.payload.error).toBeDefined();
		expect(packet.payload.error.name).toBe("MoleculerError");
		expect(packet.payload.error.message).toBe("Something happened");
		expect(packet.payload.error.code).toBe(500);
		expect(packet.payload.error.type).toBe("ERR_SOMETHING");
		expect(packet.payload.error.nodeID).toBe("far-far-node");
		expect(packet.payload.error.data).toEqual({ a: 5 });	
	});

});