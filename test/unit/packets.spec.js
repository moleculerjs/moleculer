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
		expect(packet.payload.ver).toBe(P.PROTOCOL_VERSION);
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

	it("should return a Packet instance", () => {
		transit.deserialize.mockClear();

		let packet = P.Packet.deserialize(transit, P.PACKET_HEARTBEAT, "{\"a\": 5}");
		expect(packet).toBeInstanceOf(P.PacketHeartbeat);
		expect(packet.payload).toEqual({ a: 5 });
		expect(transit.deserialize).toHaveBeenCalledTimes(1);
		expect(transit.deserialize).toHaveBeenCalledWith("{\"a\": 5}", P.PACKET_HEARTBEAT);
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
		let packet = new P.PacketHeartbeat(transit, 65);
		expect(packet).toBeDefined();
		expect(packet.type).toBe(P.PACKET_HEARTBEAT);
		expect(packet.target).toBeUndefined();
		expect(packet.payload).toBeDefined();
		expect(packet.payload.sender).toBe("node-1");
		expect(packet.payload.cpu).toBe(65);
	});

});

describe("Test PacketDiscover", () => {

	const transit = { nodeID: "node-1" };

	it("should set properties", () => {
		let packet = new P.PacketDiscover(transit, "server-2");
		expect(packet).toBeDefined();
		expect(packet.type).toBe(P.PACKET_DISCOVER);
		expect(packet.target).toBe("server-2");
		expect(packet.payload).toEqual({ sender: "node-1", ver: P.PROTOCOL_VERSION });
	});

});

describe("Test PacketInfo", () => {

	const transit = { nodeID: "node-1" };

	it("should set properties", () => {
		const info = {
			services: [
				{ name: "users", version: "2", settings: {}, actions: {
					"users.create": {}
				}, events: [
					{ name: "user.created" }
				]}
			],
			ipList: [ "127.0.0.1" ],
			client: {
				type: "node",
				version: "1.2.3",
				langVersion: "6.10.2"
			},
			config: {
				compression: "gzip"
			},
			port: 3400
		};

		let packet = new P.PacketInfo(transit, "node-2", info);
		expect(packet).toBeDefined();
		expect(packet.type).toBe(P.PACKET_INFO);
		expect(packet.target).toBe("node-2");
		expect(packet.payload).toBeDefined();
		expect(packet.payload.sender).toBe("node-1");
		expect(packet.payload.services).toEqual(info.services);
		expect(packet.payload.ipList).toEqual(info.ipList);
		expect(packet.payload.client).toEqual(info.client);
		expect(packet.payload.port).toEqual(info.port);
		expect(packet.payload.config).toEqual(info.config);
	});

});

describe("Test PacketEvent", () => {

	const transit = { nodeID: "node-1" };

	it("should set properties", () => {
		let data = { id: 5 };
		let packet = new P.PacketEvent(transit, "node-2", "user.created", data, ["users", "payments"]);
		expect(packet).toBeDefined();
		expect(packet.type).toBe(P.PACKET_EVENT);
		expect(packet.target).toBe("node-2");
		expect(packet.payload).toBeDefined();
		expect(packet.payload.sender).toBe("node-1");
		expect(packet.payload.ver).toBe(P.PROTOCOL_VERSION);
		expect(packet.payload.event).toBe("user.created");
		expect(packet.payload.data).toBe(data);
		expect(packet.payload.groups).toEqual(["users", "payments"]);
	});

	it("should handle undefined", () => {
		let packet = new P.PacketEvent(transit, "node-2", "user.updated");
		expect(packet).toBeDefined();
		expect(packet.type).toBe(P.PACKET_EVENT);
		expect(packet.target).toBe("node-2");
		expect(packet.payload).toBeDefined();
		expect(packet.payload.sender).toBe("node-1");
		expect(packet.payload.ver).toBe(P.PROTOCOL_VERSION);
		expect(packet.payload.event).toBe("user.updated");
		expect(packet.payload.data).toBeNull();
		expect(packet.payload.groups).toBeNull();
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
		expect(packet.payload.params).toEqual({ id: 5 });
		expect(packet.payload.meta).toBe(ctx.meta);
		expect(packet.payload.timeout).toBe(1500);
		expect(packet.payload.level).toBe(4);
		expect(packet.payload.metrics).toBe(true);
		expect(packet.payload.parentID).toBe("999");
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
		expect(packet.payload.data).toEqual({ id: 5 });
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
		expect(packet.payload.error.data).toEqual({ a: 5 });
	});

});

describe("Test PacketPing", () => {

	const transit = { nodeID: "node-1" };

	it("should set properties", () => {
		let packet = new P.PacketPing(transit, "node-2", 1234567);
		expect(packet).toBeDefined();
		expect(packet.type).toBe(P.PACKET_PING);
		expect(packet.target).toBe("node-2");
		expect(packet.payload).toBeDefined();
		expect(packet.payload.time).toBe(1234567);
	});

});

describe("Test PacketPong", () => {

	const transit = { nodeID: "node-1" };

	it("should set properties", () => {
		let packet = new P.PacketPong(transit, "node-2", 1234567, 7654321);
		expect(packet).toBeDefined();
		expect(packet.type).toBe(P.PACKET_PONG);
		expect(packet.target).toBe("node-2");
		expect(packet.payload).toBeDefined();
		expect(packet.payload.time).toBe(1234567);
		expect(packet.payload.arrived).toBe(7654321);
	});

});
