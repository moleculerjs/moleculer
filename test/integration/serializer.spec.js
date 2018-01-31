const ServiceBroker = require("../../src/service-broker");
const FakeTransporter = require("../../src/transporters/fake");
const Serializers = require("../../src/serializers");
const Context = require("../../src/context");
const { ValidationError } = require("../../src/errors");
const P = require("../../src/packets");

const ctx = new Context();
ctx.id = "100";
ctx.action = {
	name: "posts.find"
};
ctx.requestID = "12345";
ctx.params = { id: 5 };
ctx.meta = {
	user: {
		id: 1,
		roles: [ "admin" ]
	}
};
ctx.level = 4;
ctx.timeout = 1500;
ctx.metrics = true;
ctx.parentID = "999";

describe("Test JSON serializer", () => {

	const broker = new ServiceBroker({
		nodeID: "test-1",
		transporter: new FakeTransporter(),
		serializer: new Serializers.JSON
	});

	it("should serialize the disconnect packet", () => {
		const packet = new P.PacketDisconnect(broker.transit);
		const s = packet.serialize();
		expect(s).toBe("{\"ver\":\"3\",\"sender\":\"test-1\"}");

		const res = P.Packet.deserialize(broker.transit, P.PACKET_DISCONNECT, s);
		expect(res).toBeInstanceOf(P.PacketDisconnect);
	});

	it("should serialize the heartbeat packet", () => {
		const packet = new P.PacketHeartbeat(broker.transit, 66);
		const s = packet.serialize();
		expect(s).toBe("{\"ver\":\"3\",\"sender\":\"test-1\",\"cpu\":66}");

		const res = P.Packet.deserialize(broker.transit, P.PACKET_HEARTBEAT, s);
		expect(res).toBeInstanceOf(P.PacketHeartbeat);
		expect(res.payload.cpu).toBe(66);
	});

	it("should serialize the discover packet", () => {
		const packet = new P.PacketDiscover(broker.transit);
		const s = packet.serialize();
		expect(s).toBe("{\"ver\":\"3\",\"sender\":\"test-1\"}");

		const res = P.Packet.deserialize(broker.transit, P.PACKET_DISCOVER, s);
		expect(res).toBeInstanceOf(P.PacketDiscover);
		expect(res.payload).toEqual({ sender: "test-1", ver: "3" });
	});

	it("should serialize the info packet", () => {
		const info = {
			services: [
				{ name: "users", version: "2", settings: {}, metadata: {}, actions: {
					"users.create": {}
				}, events: {
					"user.created": {}
				}}
			],
			ipList: [ "127.0.0.1" ],
			hostname: "test-server",
			client: {
				type: "nodejs",
				version: "1.2.3",
				langVersion: "6.10.2",
			},
			config: {}
		};
		const packet = new P.PacketInfo(broker.transit, "test-2", info);
		const s = packet.serialize();
		expect(s).toBe("{\"ver\":\"3\",\"sender\":\"test-1\",\"services\":[{\"name\":\"users\",\"version\":\"2\",\"settings\":{},\"metadata\":{},\"actions\":{\"users.create\":{}},\"events\":{\"user.created\":{}}}],\"ipList\":[\"127.0.0.1\"],\"hostname\":\"test-server\",\"client\":{\"type\":\"nodejs\",\"version\":\"1.2.3\",\"langVersion\":\"6.10.2\"},\"config\":{}}");

		const res = P.Packet.deserialize(broker.transit, P.PACKET_INFO, s);
		expect(res).toBeInstanceOf(P.PacketInfo);
		expect(res.payload.services).toEqual(info.services);
		expect(res.payload.ipList).toEqual(info.ipList);
		expect(res.payload.hostname).toEqual(info.hostname);
		expect(res.payload.client).toEqual(info.client);
		expect(res.payload.config).toEqual(info.config);
	});

	it("should serialize the event packet", () => {
		const data = {
			a: 5,
			b: "Test"
		};
		const packet = new P.PacketEvent(broker.transit, "test-2", "user.created", data);
		const s = packet.serialize();
		expect(s).toBe("{\"ver\":\"3\",\"sender\":\"test-1\",\"event\":\"user.created\",\"data\":{\"a\":5,\"b\":\"Test\"},\"groups\":null,\"broadcast\":false}");

		const res = P.Packet.deserialize(broker.transit, P.PACKET_EVENT, s);
		expect(res).toBeInstanceOf(P.PacketEvent);
		expect(res.payload.event).toEqual("user.created");
		expect(res.payload.data).toEqual(data);
		expect(res.payload.groups).toBeNull();
		expect(res.payload.broadcast).toBe(false);
	});

	it("should serialize the event packet with groups", () => {
		const data = {
			a: 5,
			b: "Test"
		};
		const packet = new P.PacketEvent(broker.transit, "test-2", "user.created", data, ["users", "payments"], true);
		const s = packet.serialize();
		expect(s).toBe("{\"ver\":\"3\",\"sender\":\"test-1\",\"event\":\"user.created\",\"data\":{\"a\":5,\"b\":\"Test\"},\"groups\":[\"users\",\"payments\"],\"broadcast\":true}");

		const res = P.Packet.deserialize(broker.transit, P.PACKET_EVENT, s);
		expect(res).toBeInstanceOf(P.PacketEvent);
		expect(res.payload.event).toEqual("user.created");
		expect(res.payload.data).toEqual(data);
		expect(res.payload.groups).toEqual(["users", "payments"]);
		expect(res.payload.broadcast).toBe(true);
	});

	it("should serialize the request packet", () => {
		const packet = new P.PacketRequest(broker.transit, "test-2", ctx);
		const s = packet.serialize();
		expect(s).toBe("{\"ver\":\"3\",\"sender\":\"test-1\",\"id\":\"100\",\"action\":\"posts.find\",\"params\":{\"id\":5},\"meta\":{\"user\":{\"id\":1,\"roles\":[\"admin\"]}},\"timeout\":1500,\"level\":4,\"metrics\":true,\"parentID\":\"999\",\"requestID\":\"12345\"}");

		const res = P.Packet.deserialize(broker.transit, P.PACKET_REQUEST, s);
		expect(res).toBeInstanceOf(P.PacketRequest);
		expect(res.payload.id).toBe("100");
		expect(res.payload.action).toBe("posts.find");
		expect(res.payload.params).toEqual(ctx.params);
		expect(res.payload.meta).toEqual(ctx.meta);
		expect(res.payload.timeout).toBe(1500);
		expect(res.payload.metrics).toBe(true);
		expect(res.payload.parentID).toBe("999");
		expect(res.payload.requestID).toBe("12345");
	});

	it("should serialize the response packet with data", () => {
		const data = [
			{ id: 1, name: "John" },
			{ id: 2, name: "Jane" }
		];
		const packet = new P.PacketResponse(broker.transit, "test-2", "12345", { b: 100 }, data);
		const s = packet.serialize();
		expect(s).toBe("{\"ver\":\"3\",\"sender\":\"test-1\",\"id\":\"12345\",\"meta\":{\"b\":100},\"success\":true,\"data\":[{\"id\":1,\"name\":\"John\"},{\"id\":2,\"name\":\"Jane\"}]}");

		const res = P.Packet.deserialize(broker.transit, P.PACKET_RESPONSE, s);
		expect(res).toBeInstanceOf(P.PacketResponse);
		expect(res.payload.id).toBe("12345");
		expect(res.payload.meta).toEqual({ b: 100 });
		expect(res.payload.data).toEqual(data);
	});

	it("should serialize the response packet with error", () => {
		const err = new ValidationError("Invalid email!", "ERR_INVALID_A", { a: 5 });
		err.stack ="STACK_PLACEHOLDER";
		const packet = new P.PacketResponse(broker.transit, "test-2", "12345", { b: 100 }, null, err);
		const s = packet.serialize();
		expect(s).toBe("{\"ver\":\"3\",\"sender\":\"test-1\",\"id\":\"12345\",\"meta\":{\"b\":100},\"success\":false,\"data\":null,\"error\":{\"name\":\"ValidationError\",\"message\":\"Invalid email!\",\"nodeID\":\"test-1\",\"code\":422,\"type\":\"ERR_INVALID_A\",\"stack\":\"STACK_PLACEHOLDER\",\"data\":{\"a\":5}}}");

		const res = P.Packet.deserialize(broker.transit, P.PACKET_RESPONSE, s);
		expect(res).toBeInstanceOf(P.PacketResponse);
		expect(res.payload.id).toBe("12345");
		expect(res.payload.meta).toEqual({ b: 100 });
		expect(res.payload.error).toEqual({
			name: "ValidationError",
			message: "Invalid email!",
			code: 422,
			nodeID: "test-1",
			type: "ERR_INVALID_A",
			stack: "STACK_PLACEHOLDER",
			data: {
				a: 5
			}
		});
	});

	it("should serialize the ping packet", () => {
		const packet = new P.PacketPing(broker.transit, "test-2", 1234567);
		const s = packet.serialize();
		expect(s).toBe("{\"ver\":\"3\",\"sender\":\"test-1\",\"time\":1234567}");

		const res = P.Packet.deserialize(broker.transit, P.PACKET_PING, s);
		expect(res).toBeInstanceOf(P.PacketPing);
		expect(res.payload.time).toBe(1234567);
	});

	it("should serialize the pong packet", () => {
		const packet = new P.PacketPong(broker.transit, "test-2", 1234567, 7654321);
		const s = packet.serialize();
		expect(s).toBe("{\"ver\":\"3\",\"sender\":\"test-1\",\"time\":1234567,\"arrived\":7654321}");

		const res = P.Packet.deserialize(broker.transit, P.PACKET_PONG, s);
		expect(res).toBeInstanceOf(P.PacketPong);
		expect(res.payload.time).toBe(1234567);
		expect(res.payload.arrived).toBe(7654321);
	});

});

describe("Test Avro serializer", () => {

	const broker = new ServiceBroker({
		nodeID: "test-1",
		transporter: new FakeTransporter(),
		serializer: new Serializers.Avro
	});

	it("should serialize the disconnect packet", () => {
		const packet = new P.PacketDisconnect(broker.transit);
		const s = packet.serialize();
		expect(s.length).toBe(9);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_DISCONNECT, s);
		expect(res).toBeInstanceOf(P.PacketDisconnect);
	});

	it("should serialize the heartbeat packet", () => {
		const packet = new P.PacketHeartbeat(broker.transit, 120);
		const s = packet.serialize();
		expect(s.length).toBe(17);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_HEARTBEAT, s);
		expect(res).toBeInstanceOf(P.PacketHeartbeat);
		expect(res.payload.cpu).toBe(120);
	});

	it("should serialize the discover packet", () => {
		const packet = new P.PacketDiscover(broker.transit);
		const s = packet.serialize();
		expect(s.length).toBe(9);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_DISCOVER, s);
		expect(res).toBeInstanceOf(P.PacketDiscover);
		expect(res.payload).toEqual({ sender: "test-1", ver: "3" });
	});

	it("should serialize the info packet", () => {
		const info = {
			services: [
				{ name: "users", version: "2", settings: {}, metadata: {}, actions: {
					"users.create": {}
				}, events: {
					"user.created": {}
				}}
			],
			ipList: [ "127.0.0.1" ],
			hostname: "test-server",
			client: {
				type: "nodejs",
				version: "1.2.3",
				langVersion: "6.10.2",
			},
			config: {}
		};
		const packet = new P.PacketInfo(broker.transit, "test-2", info);
		const s = packet.serialize();
		expect(s.length).toBe(177);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_INFO, s);
		expect(res).toBeInstanceOf(P.PacketInfo);
		expect(res.payload.services).toEqual(info.services);
		expect(res.payload.ipList).toEqual(info.ipList);
		expect(res.payload.hostname).toEqual(info.hostname);
		expect(res.payload.client).toEqual(info.client);
		expect(res.payload.config).toEqual(info.config);
	});

	it("should serialize the event packet", () => {
		const data = {
			a: 5,
			b: "Test"
		};
		const packet = new P.PacketEvent(broker.transit, "test-2", "user.created", data);
		const s = packet.serialize();
		expect(s.length).toBe(43);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_EVENT, s);
		expect(res).toBeInstanceOf(P.PacketEvent);
		expect(res.payload.event).toEqual("user.created");
		expect(res.payload.data).toEqual(data);
		expect(res.payload.groups).toBeNull();
	});

	it("should serialize the event packet with groups", () => {
		const data = {
			a: 5,
			b: "Test"
		};
		const packet = new P.PacketEvent(broker.transit, "test-2", "user.created", data, ["users", "payments"], true);
		const s = packet.serialize();
		expect(s.length).toBe(60);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_EVENT, s);
		expect(res).toBeInstanceOf(P.PacketEvent);
		expect(res.payload.event).toEqual("user.created");
		expect(res.payload.data).toEqual(data);
		expect(res.payload.groups).toEqual(["users", "payments"]);
	});

	it("should serialize the request packet", () => {
		const packet = new P.PacketRequest(broker.transit, "test-2", ctx);
		const s = packet.serialize();
		expect(s.length).toBe(91);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_REQUEST, s);
		expect(res).toBeInstanceOf(P.PacketRequest);
		expect(res.payload.id).toBe("100");
		expect(res.payload.action).toBe("posts.find");
		expect(res.payload.params).toEqual(ctx.params);
		expect(res.payload.meta).toEqual(ctx.meta);
		expect(res.payload.timeout).toBe(1500);
		expect(res.payload.metrics).toBe(true);
		expect(res.payload.parentID).toBe("999");
		expect(res.payload.requestID).toBe("12345");
	});

	it("should serialize the response packet with data", () => {
		const data = [
			{ id: 1, name: "John" },
			{ id: 2, name: "Jane" }
		];
		const packet = new P.PacketResponse(broker.transit, "test-2", "12345", { b: 100 }, data);
		const s = packet.serialize();
		expect(s.length).toBe(76);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_RESPONSE, s);
		expect(res).toBeInstanceOf(P.PacketResponse);
		expect(res.payload.id).toBe("12345");
		expect(res.payload.meta).toEqual({ b: 100 });
		expect(res.payload.data).toEqual(data);
	});

	it("should serialize the response packet with error", () => {
		const err = new ValidationError("Invalid email!", "ERR_INVALID_A", { a: 5 });
		err.stack = "STACK_PLACEHOLDER";

		const packet = new P.PacketResponse(broker.transit, "test-2", "12345", { b: 100 }, null, err);
		const s = packet.serialize();
		expect(s.length).toBe(178);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_RESPONSE, s);
		expect(res).toBeInstanceOf(P.PacketResponse);
		expect(res.payload.id).toBe("12345");
		expect(res.payload.meta).toEqual({ b: 100 });
		expect(res.payload.error).toEqual({
			name: "ValidationError",
			message: "Invalid email!",
			code: 422,
			nodeID: "test-1",
			type: "ERR_INVALID_A",
			stack: "STACK_PLACEHOLDER",
			data: {
				a: 5
			}
		});
	});

	it("should serialize the ping packet", () => {
		const packet = new P.PacketPing(broker.transit, "test-2", 1234567);
		const s = packet.serialize();
		expect(s.length).toBe(13);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_PING, s);
		expect(res).toBeInstanceOf(P.PacketPing);
		expect(res.payload.time).toBe(1234567);
	});

	it("should serialize the pong packet", () => {
		const packet = new P.PacketPong(broker.transit, "test-2", 1234567, 7654321);
		const s = packet.serialize();
		expect(s.length).toBe(17);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_PONG, s);
		expect(res).toBeInstanceOf(P.PacketPong);
		expect(res.payload.time).toBe(1234567);
		expect(res.payload.arrived).toBe(7654321);
	});

});


describe("Test MsgPack serializer", () => {

	const broker = new ServiceBroker({
		nodeID: "test-1",
		transporter: new FakeTransporter(),
		serializer: new Serializers.MsgPack
	});

	it("should serialize the disconnect packet", () => {
		const packet = new P.PacketDisconnect(broker.transit);
		const s = packet.serialize();
		expect(s).toBeInstanceOf(Buffer);
		expect(Buffer.byteLength(s, "binary")).toBe(21);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_DISCONNECT, s);
		expect(res).toBeInstanceOf(P.PacketDisconnect);
	});

	it("should serialize the heartbeat packet", () => {
		const packet = new P.PacketHeartbeat(broker.transit, 120);
		const s = packet.serialize();
		expect(Buffer.byteLength(s, "binary")).toBe(26);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_HEARTBEAT, s);
		expect(res).toBeInstanceOf(P.PacketHeartbeat);
		expect(res.payload.cpu).toBe(120);
	});

	it("should serialize the discover packet", () => {
		const packet = new P.PacketDiscover(broker.transit);
		const s = packet.serialize();
		expect(Buffer.byteLength(s, "binary")).toBe(21);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_DISCOVER, s);
		expect(res).toBeInstanceOf(P.PacketDiscover);
		expect(res.payload).toEqual({ sender: "test-1", ver: "3" });
	});

	it("should serialize the info packet", () => {
		const info = {
			services: [
				{ name: "users", version: "2", settings: {}, metadata: {}, actions: {
					"users.create": {}
				}, events: {
					"user.created": {}
				}}
			],
			ipList: [ "127.0.0.1" ],
			hostname: "test-server",
			client: {
				type: "nodejs",
				version: "1.2.3",
				langVersion: "6.10.2",
			},
			config: {}
		};
		const packet = new P.PacketInfo(broker.transit, "test-2", info);
		const s = packet.serialize();
		expect(Buffer.byteLength(s, "binary")).toBe(218);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_INFO, s);
		expect(res).toBeInstanceOf(P.PacketInfo);
		expect(res.payload.services).toEqual(info.services);
		expect(res.payload.ipList).toEqual(info.ipList);
		expect(res.payload.client).toEqual(info.client);
		expect(res.payload.config).toEqual(info.config);
	});

	it("should serialize the event packet", () => {
		const data = {
			a: 5,
			b: "Test"
		};
		const packet = new P.PacketEvent(broker.transit, "test-2", "user.created", data);
		const s = packet.serialize();
		expect(Buffer.byteLength(s, "binary")).toBe(75);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_EVENT, s);
		expect(res).toBeInstanceOf(P.PacketEvent);
		expect(res.payload.event).toEqual("user.created");
		expect(res.payload.data).toEqual(data);
		expect(res.payload.groups).toBeNull();
	});

	it("should serialize the event packet with groups", () => {
		const data = {
			a: 5,
			b: "Test"
		};
		const packet = new P.PacketEvent(broker.transit, "test-2", "user.created", data, ["users", "payments"], true);
		const s = packet.serialize();
		expect(Buffer.byteLength(s, "binary")).toBe(90);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_EVENT, s);
		expect(res).toBeInstanceOf(P.PacketEvent);
		expect(res.payload.event).toEqual("user.created");
		expect(res.payload.data).toEqual(data);
		expect(res.payload.groups).toEqual(["users", "payments"]);
	});

	it("should serialize the request packet", () => {
		const packet = new P.PacketRequest(broker.transit, "test-2", ctx);
		const s = packet.serialize();
		expect(Buffer.byteLength(s, "binary")).toBe(143);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_REQUEST, s);
		expect(res).toBeInstanceOf(P.PacketRequest);
		expect(res.payload.id).toBe("100");
		expect(res.payload.action).toBe("posts.find");
		expect(res.payload.params).toEqual(ctx.params);
		expect(res.payload.meta).toEqual(ctx.meta);
		expect(res.payload.timeout).toBe(1500);
		expect(res.payload.metrics).toBe(true);
		expect(res.payload.parentID).toBe("999");
		expect(res.payload.requestID).toBe("12345");
	});

	it("should serialize the response packet with data", () => {
		const data = [
			{ id: 1, name: "John" },
			{ id: 2, name: "Jane" }
		];
		const packet = new P.PacketResponse(broker.transit, "test-2", "12345", { b: 100 }, data);
		const s = packet.serialize();
		expect(Buffer.byteLength(s, "binary")).toBe(84);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_RESPONSE, s);
		expect(res).toBeInstanceOf(P.PacketResponse);
		expect(res.payload.id).toBe("12345");
		expect(res.payload.data).toEqual(data);
		expect(res.payload.meta).toEqual({ b: 100 });
	});

	it("should serialize the response packet with error", () => {
		const err = new ValidationError("Invalid email!", "ERR_INVALID_A", { a: 5 });
		err.stack = "STACK_PLACEHOLDER";

		const packet = new P.PacketResponse(broker.transit, "test-2", "12345", { b: 100 }, null, err);
		const s = packet.serialize();
		expect(Buffer.byteLength(s, "binary")).toBe(179);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_RESPONSE, s);
		expect(res).toBeInstanceOf(P.PacketResponse);
		expect(res.payload.id).toBe("12345");
		expect(res.payload.meta).toEqual({ b: 100 });
		expect(res.payload.error).toEqual({
			name: "ValidationError",
			message: "Invalid email!",
			code: 422,
			type: "ERR_INVALID_A",
			nodeID: "test-1",
			stack: "STACK_PLACEHOLDER",
			data: {
				a: 5
			}
		});
	});

	it("should serialize the ping packet", () => {
		const packet = new P.PacketPing(broker.transit, "test-2", 1234567);
		const s = packet.serialize();
		expect(s.length).toBe(31);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_PING, s);
		expect(res).toBeInstanceOf(P.PacketPing);
		expect(res.payload.time).toBe(1234567);
	});

	it("should serialize the pong packet", () => {
		const packet = new P.PacketPong(broker.transit, "test-2", 1234567, 7654321);
		const s = packet.serialize();
		expect(s.length).toBe(44);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_PONG, s);
		expect(res).toBeInstanceOf(P.PacketPong);
		expect(res.payload.time).toBe(1234567);
		expect(res.payload.arrived).toBe(7654321);
	});
});

describe("Test ProtoBuf serializer", () => {

	const broker = new ServiceBroker({
		nodeID: "test-1",
		transporter: new FakeTransporter(),
		serializer: new Serializers.ProtoBuf
	});

	it("should serialize the disconnect packet", () => {
		const packet = new P.PacketDisconnect(broker.transit);
		const s = packet.serialize();
		expect(s.length).toBe(11);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_DISCONNECT, s);
		expect(res).toBeInstanceOf(P.PacketDisconnect);
	});

	it("should serialize the heartbeat packet", () => {
		const packet = new P.PacketHeartbeat(broker.transit, 120);
		const s = packet.serialize();
		expect(s.length).toBe(20);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_HEARTBEAT, s);
		expect(res).toBeInstanceOf(P.PacketHeartbeat);
		expect(res.payload.cpu).toBe(120);
	});

	it("should serialize the discover packet", () => {
		const packet = new P.PacketDiscover(broker.transit);
		const s = packet.serialize();
		expect(s.length).toBe(11);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_DISCOVER, s);
		expect(res).toBeInstanceOf(P.PacketDiscover);
		expect(res.payload).toEqual({ sender: "test-1", ver: "3" });
	});

	it("should serialize the info packet", () => {
		const info = {
			services: [
				{ name: "users", version: "2", settings: {}, metadata: {}, actions: {
					"users.create": {}
				}, events: {
					"user.created": {}
				}}
			],
			ipList: [ "127.0.0.1" ],
			hostname: "test-server",
			client: {
				type: "nodejs",
				version: "1.2.3",
				langVersion: "6.10.2",
			},
			config: {}
		};
		const packet = new P.PacketInfo(broker.transit, "test-2", info);
		const s = packet.serialize();
		expect(s.length).toBe(185);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_INFO, s);
		expect(res).toBeInstanceOf(P.PacketInfo);
		expect(res.payload.services).toEqual(info.services);
		expect(res.payload.ipList).toEqual(info.ipList);
		expect(res.payload.client).toEqual(info.client);
		expect(res.payload.config).toEqual(info.config);
	});

	it("should serialize the event packet", () => {
		const data = {
			a: 5,
			b: "Test"
		};
		const packet = new P.PacketEvent(broker.transit, "test-2", "user.created", data);
		const s = packet.serialize();
		expect(s.length).toBe(45);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_EVENT, s);
		expect(res).toBeInstanceOf(P.PacketEvent);
		expect(res.payload.event).toEqual("user.created");
		expect(res.payload.data).toEqual(data);
		expect(res.payload.groups).toEqual([]);
	});

	it("should serialize the event packet with groups", () => {
		const data = {
			a: 5,
			b: "Test"
		};
		const packet = new P.PacketEvent(broker.transit, "test-2", "user.created", data, ["users", "payments"], true);
		const s = packet.serialize();
		expect(s.length).toBe(62);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_EVENT, s);
		expect(res).toBeInstanceOf(P.PacketEvent);
		expect(res.payload.event).toEqual("user.created");
		expect(res.payload.data).toEqual(data);
		expect(res.payload.groups).toEqual(["users", "payments"]);
	});

	it("should serialize the request packet", () => {
		const packet = new P.PacketRequest(broker.transit, "test-2", ctx);
		const s = packet.serialize();
		expect(s.length).toBe(100);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_REQUEST, s);
		expect(res).toBeInstanceOf(P.PacketRequest);
		expect(res.payload.id).toBe("100");
		expect(res.payload.action).toBe("posts.find");
		expect(res.payload.params).toEqual(ctx.params);
		expect(res.payload.meta).toEqual(ctx.meta);
		expect(res.payload.timeout).toBe(1500);
		expect(res.payload.metrics).toBe(true);
		expect(res.payload.parentID).toBe("999");
		expect(res.payload.requestID).toBe("12345");
	});

	it("should serialize the response packet with data", () => {
		const data = [
			{ id: 1, name: "John" },
			{ id: 2, name: "Jane" }
		];
		const packet = new P.PacketResponse(broker.transit, "test-2", "12345", { b: 100 }, data);
		const s = packet.serialize();
		expect(s.length).toBe(80);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_RESPONSE, s);
		expect(res).toBeInstanceOf(P.PacketResponse);
		expect(res.payload.id).toBe("12345");
		expect(res.payload.data).toEqual(data);
		expect(res.payload.meta).toEqual({ b: 100 });
	});

	it("should serialize the response packet with error", () => {
		const err = new ValidationError("Invalid email!", "ERR_INVALID_A", { a: 5 });
		err.stack = "STACK_PLACEHOLDER";

		const packet = new P.PacketResponse(broker.transit, "test-2", "12345", { b: 100 }, null, err);
		const s = packet.serialize(100);
		expect(s.length).toBe(182);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_RESPONSE, s);
		expect(res).toBeInstanceOf(P.PacketResponse);
		expect(res.payload.id).toBe("12345");
		expect(res.payload.meta).toEqual({ b: 100 });
		expect(res.payload.error).toEqual({
			name: "ValidationError",
			message: "Invalid email!",
			code: 422,
			type: "ERR_INVALID_A",
			stack: "STACK_PLACEHOLDER",
			nodeID: "test-1",
			data: {
				a: 5
			}
		});
	});

	it("should serialize the ping packet", () => {
		const packet = new P.PacketPing(broker.transit, "test-2", 1234567);
		const s = packet.serialize();
		expect(s.length).toBe(15);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_PING, s);
		expect(res).toBeInstanceOf(P.PacketPing);
		// TODO: expect(res.payload.time).toBe(1234567);
	});

	it("should serialize the pong packet", () => {
		const packet = new P.PacketPong(broker.transit, "test-2", 1234567, 7654321);
		const s = packet.serialize();
		expect(s.length).toBe(20);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_PONG, s);
		expect(res).toBeInstanceOf(P.PacketPong);
		// TODO: expect(res.payload.time).toBe(1234567);
		// TODO: expect(res.payload.arrived).toBe(7654321);
	});
});
