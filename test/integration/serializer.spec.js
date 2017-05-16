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
		expect(s).toBe("{\"sender\":\"test-1\"}");

		const res = P.Packet.deserialize(broker.transit, P.PACKET_DISCONNECT, s);
		expect(res).toBeInstanceOf(P.PacketDisconnect);
	});		

	it("should serialize the heartbeat packet", () => {
		const packet = new P.PacketHeartbeat(broker.transit);
		const s = packet.serialize();
		expect(s).toBe("{\"sender\":\"test-1\"}");

		const res = P.Packet.deserialize(broker.transit, P.PACKET_HEARTBEAT, s);
		expect(res).toBeInstanceOf(P.PacketHeartbeat);
	});		

	it("should serialize the discover packet", () => {
		const actions = {
			"user.find": { cache: true },
			"user.create": {}
		};
		const packet = new P.PacketDiscover(broker.transit, actions);
		const s = packet.serialize();
		expect(s).toBe("{\"sender\":\"test-1\",\"actions\":\"{\\\"user.find\\\":{\\\"cache\\\":true},\\\"user.create\\\":{}}\"}");

		const res = P.Packet.deserialize(broker.transit, P.PACKET_DISCOVER, s);
		expect(res).toBeInstanceOf(P.PacketDiscover);
		expect(res.payload.actions).toEqual(actions);
	});		

	it("should serialize the info packet", () => {
		const actions = {
			"user.find": { cache: true },
			"user.create": {}
		};
		const packet = new P.PacketInfo(broker.transit, "test-2", actions);
		const s = packet.serialize();
		expect(s).toBe("{\"sender\":\"test-1\",\"actions\":\"{\\\"user.find\\\":{\\\"cache\\\":true},\\\"user.create\\\":{}}\"}");

		const res = P.Packet.deserialize(broker.transit, P.PACKET_INFO, s);
		expect(res).toBeInstanceOf(P.PacketInfo);
		expect(res.payload.actions).toEqual(actions);
	});		

	it("should serialize the event packet", () => {
		const data = {
			a: 5,
			b: "Test"
		};
		const packet = new P.PacketEvent(broker.transit, "user.created", data);
		const s = packet.serialize();
		expect(s).toBe("{\"sender\":\"test-1\",\"event\":\"user.created\",\"data\":\"{\\\"a\\\":5,\\\"b\\\":\\\"Test\\\"}\"}");

		const res = P.Packet.deserialize(broker.transit, P.PACKET_EVENT, s);
		expect(res).toBeInstanceOf(P.PacketEvent);
		expect(res.payload.data).toEqual(data);
	});		

	it("should serialize the request packet", () => {
		const packet = new P.PacketRequest(broker.transit, "test-2", ctx);
		const s = packet.serialize();
		expect(s).toBe("{\"sender\":\"test-1\",\"id\":\"100\",\"action\":\"posts.find\",\"params\":\"{\\\"id\\\":5}\",\"meta\":\"{\\\"user\\\":{\\\"id\\\":1,\\\"roles\\\":[\\\"admin\\\"]}}\",\"timeout\":1500,\"level\":4,\"metrics\":true,\"parentID\":\"999\"}");

		const res = P.Packet.deserialize(broker.transit, P.PACKET_REQUEST, s);
		expect(res).toBeInstanceOf(P.PacketRequest);
		expect(res.payload.id).toBe("100");
		expect(res.payload.action).toBe("posts.find");
		expect(res.payload.params).toEqual(ctx.params);
		expect(res.payload.meta).toEqual(ctx.meta);
		expect(res.payload.timeout).toBe(1500);
		expect(res.payload.metrics).toBe(true);
		expect(res.payload.parentID).toBe("999");
	});		

	it("should serialize the response packet with data", () => {
		const data = [
			{ id: 1, name: "John" },
			{ id: 2, name: "Jane" }
		];
		const packet = new P.PacketResponse(broker.transit, "test-2", "12345", data);
		const s = packet.serialize();
		expect(s).toBe("{\"sender\":\"test-1\",\"id\":\"12345\",\"success\":true,\"data\":\"[{\\\"id\\\":1,\\\"name\\\":\\\"John\\\"},{\\\"id\\\":2,\\\"name\\\":\\\"Jane\\\"}]\"}");

		const res = P.Packet.deserialize(broker.transit, P.PACKET_RESPONSE, s);
		expect(res).toBeInstanceOf(P.PacketResponse);
		expect(res.payload.id).toBe("12345");
		expect(res.payload.data).toEqual(data);
	});		

	it("should serialize the response packet with error", () => {
		const err = new ValidationError("Invalid email!", { a: 5 });
		err.stack ="STACK_PLACEHOLDER";
		const packet = new P.PacketResponse(broker.transit, "test-2", "12345", null, err);
		const s = packet.serialize();
		expect(s).toBe("{\"sender\":\"test-1\",\"id\":\"12345\",\"success\":false,\"data\":null,\"error\":{\"name\":\"ValidationError\",\"message\":\"Invalid email!\",\"nodeID\":\"test-1\",\"code\":422,\"stack\":\"STACK_PLACEHOLDER\",\"data\":\"{\\\"a\\\":5}\"}}");

		const res = P.Packet.deserialize(broker.transit, P.PACKET_RESPONSE, s);
		expect(res).toBeInstanceOf(P.PacketResponse);
		expect(res.payload.id).toBe("12345");
		expect(res.payload.error).toEqual({
			name: "ValidationError",
			message: "Invalid email!",
			code: 422,
			nodeID: "test-1",
			stack: "STACK_PLACEHOLDER",
			data: {
				a: 5
			}
		});
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
		expect(s.length).toBe(7);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_DISCONNECT, s);
		expect(res).toBeInstanceOf(P.PacketDisconnect);
	});		

	it("should serialize the heartbeat packet", () => {
		const packet = new P.PacketHeartbeat(broker.transit);
		const s = packet.serialize();
		expect(s.length).toBe(7);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_HEARTBEAT, s);
		expect(res).toBeInstanceOf(P.PacketHeartbeat);
	});		

	it("should serialize the discover packet", () => {
		const actions = {
			"user.find": { cache: true },
			"user.create": {}
		};
		const packet = new P.PacketDiscover(broker.transit, actions);
		const s = packet.serialize();
		expect(s.length).toBe(53);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_DISCOVER, s);
		expect(res).toBeInstanceOf(P.PacketDiscover);
		expect(res.payload.actions).toEqual(actions);
	});		

	it("should serialize the info packet", () => {
		const actions = {
			"user.find": { cache: true },
			"user.create": {}
		};
		const packet = new P.PacketInfo(broker.transit, "test-2", actions);
		const s = packet.serialize();
		expect(s.length).toBe(53);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_INFO, s);
		expect(res).toBeInstanceOf(P.PacketInfo);
		expect(res.payload.actions).toEqual(actions);
	});		

	it("should serialize the event packet", () => {
		const data = {
			a: 5,
			b: "Test"
		};
		const packet = new P.PacketEvent(broker.transit, "user.created", data);
		const s = packet.serialize();
		expect(s.length).toBe(39);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_EVENT, s);
		expect(res).toBeInstanceOf(P.PacketEvent);
		expect(res.payload.data).toEqual(data);
	});		

	it("should serialize the request packet", () => {
		const packet = new P.PacketRequest(broker.transit, "test-2", ctx);
		const s = packet.serialize();
		expect(s.length).toBe(76);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_REQUEST, s);
		expect(res).toBeInstanceOf(P.PacketRequest);
		expect(res.payload.id).toBe("100");
		expect(res.payload.action).toBe("posts.find");
		expect(res.payload.params).toEqual(ctx.params);
		expect(res.payload.meta).toEqual(ctx.meta);
		expect(res.payload.timeout).toBe(1500);
		expect(res.payload.metrics).toBe(true);
		expect(res.payload.parentID).toBe("999");
	});		

	it("should serialize the response packet with data", () => {
		const data = [
			{ id: 1, name: "John" },
			{ id: 2, name: "Jane" }
		];
		const packet = new P.PacketResponse(broker.transit, "test-2", "12345", data);
		const s = packet.serialize();
		expect(s.length).toBe(64);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_RESPONSE, s);
		expect(res).toBeInstanceOf(P.PacketResponse);
		expect(res.payload.id).toBe("12345");
		expect(res.payload.data).toEqual(data);
	});		

	it("should serialize the response packet with error", () => {
		const err = new ValidationError("Invalid email!", { a: 5 });
		err.stack = "STACK_PLACEHOLDER";

		const packet = new P.PacketResponse(broker.transit, "test-2", "12345", null, err);
		const s = packet.serialize(100);
		expect(s.length).toBe(82);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_RESPONSE, s);
		expect(res).toBeInstanceOf(P.PacketResponse);
		expect(res.payload.id).toBe("12345");
		expect(res.payload.error).toEqual({
			name: "ValidationError",
			message: "Invalid email!",
			code: 422,
			nodeID: "test-1",
			stack: "STACK_PLACEHOLDER",
			data: {
				a: 5
			}
		});
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
		expect(Buffer.byteLength(s, "binary")).toBe(15);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_DISCONNECT, s);
		expect(res).toBeInstanceOf(P.PacketDisconnect);
	});		

	it("should serialize the heartbeat packet", () => {
		const packet = new P.PacketHeartbeat(broker.transit);
		const s = packet.serialize();
		expect(Buffer.byteLength(s, "binary")).toBe(15);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_HEARTBEAT, s);
		expect(res).toBeInstanceOf(P.PacketHeartbeat);
	});		

	it("should serialize the discover packet", () => {
		const actions = {
			"user.find": { cache: true },
			"user.create": {}
		};
		const packet = new P.PacketDiscover(broker.transit, actions);
		const s = packet.serialize();
		expect(Buffer.byteLength(s, "binary")).toBe(70);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_DISCOVER, s);
		expect(res).toBeInstanceOf(P.PacketDiscover);
		expect(res.payload.actions).toEqual(actions);
	});		

	it("should serialize the info packet", () => {
		const actions = {
			"user.find": { cache: true },
			"user.create": {}
		};
		const packet = new P.PacketInfo(broker.transit, "test-2", actions);
		const s = packet.serialize();
		expect(Buffer.byteLength(s, "binary")).toBe(70);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_INFO, s);
		expect(res).toBeInstanceOf(P.PacketInfo);
		expect(res.payload.actions).toEqual(actions);
	});		

	it("should serialize the event packet", () => {
		const data = {
			a: 5,
			b: "Test"
		};
		const packet = new P.PacketEvent(broker.transit, "user.created", data);
		const s = packet.serialize();
		expect(Buffer.byteLength(s, "binary")).toBe(58);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_EVENT, s);
		expect(res).toBeInstanceOf(P.PacketEvent);
		expect(res.payload.data).toEqual(data);
	});		

	it("should serialize the request packet", () => {
		const packet = new P.PacketRequest(broker.transit, "test-2", ctx);
		const s = packet.serialize();
		expect(Buffer.byteLength(s, "binary")).toBe(138);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_REQUEST, s);
		expect(res).toBeInstanceOf(P.PacketRequest);
		expect(res.payload.id).toBe("100");
		expect(res.payload.action).toBe("posts.find");
		expect(res.payload.params).toEqual(ctx.params);
		expect(res.payload.meta).toEqual(ctx.meta);
		expect(res.payload.timeout).toBe(1500);
		expect(res.payload.metrics).toBe(true);
		expect(res.payload.parentID).toBe("999");
	});		

	it("should serialize the response packet with data", () => {
		const data = [
			{ id: 1, name: "John" },
			{ id: 2, name: "Jane" }
		];
		const packet = new P.PacketResponse(broker.transit, "test-2", "12345", data);
		const s = packet.serialize();
		expect(Buffer.byteLength(s, "binary")).toBe(87);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_RESPONSE, s);
		expect(res).toBeInstanceOf(P.PacketResponse);
		expect(res.payload.id).toBe("12345");
		expect(res.payload.data).toEqual(data);
	});		

	it("should serialize the response packet with error", () => {
		const err = new ValidationError("Invalid email!", { a: 5 });
		err.stack = "STACK_PLACEHOLDER";

		const packet = new P.PacketResponse(broker.transit, "test-2", "12345", null, err);
		const s = packet.serialize();
		expect(Buffer.byteLength(s, "binary")).toBe(149);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_RESPONSE, s);
		expect(res).toBeInstanceOf(P.PacketResponse);
		expect(res.payload.id).toBe("12345");
		expect(res.payload.error).toEqual({
			name: "ValidationError",
			message: "Invalid email!",
			code: 422,
			nodeID: "test-1",
			stack: "STACK_PLACEHOLDER",
			data: {
				a: 5
			}
		});
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
		expect(s.length).toBe(8);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_DISCONNECT, s);
		expect(res).toBeInstanceOf(P.PacketDisconnect);
	});		

	it("should serialize the heartbeat packet", () => {
		const packet = new P.PacketHeartbeat(broker.transit);
		const s = packet.serialize();
		expect(s.length).toBe(8);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_HEARTBEAT, s);
		expect(res).toBeInstanceOf(P.PacketHeartbeat);
	});		

	it("should serialize the discover packet", () => {
		const actions = {
			"user.find": { cache: true },
			"user.create": {}
		};
		const packet = new P.PacketDiscover(broker.transit, actions);
		const s = packet.serialize();
		expect(s.length).toBe(55);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_DISCOVER, s);
		expect(res).toBeInstanceOf(P.PacketDiscover);
		expect(res.payload.actions).toEqual(actions);
	});		

	it("should serialize the info packet", () => {
		const actions = {
			"user.find": { cache: true },
			"user.create": {}
		};
		const packet = new P.PacketInfo(broker.transit, "test-2", actions);
		const s = packet.serialize();
		expect(s.length).toBe(55);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_INFO, s);
		expect(res).toBeInstanceOf(P.PacketInfo);
		expect(res.payload.actions).toEqual(actions);
	});		

	it("should serialize the event packet", () => {
		const data = {
			a: 5,
			b: "Test"
		};
		const packet = new P.PacketEvent(broker.transit, "user.created", data);
		const s = packet.serialize();
		expect(s.length).toBe(42);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_EVENT, s);
		expect(res).toBeInstanceOf(P.PacketEvent);
		expect(res.payload.data).toEqual(data);
	});		

	it("should serialize the request packet", () => {
		const packet = new P.PacketRequest(broker.transit, "test-2", ctx);
		const s = packet.serialize();
		expect(s.length).toBe(84);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_REQUEST, s);
		expect(res).toBeInstanceOf(P.PacketRequest);
		expect(res.payload.id).toBe("100");
		expect(res.payload.action).toBe("posts.find");
		expect(res.payload.params).toEqual(ctx.params);
		expect(res.payload.meta).toEqual(ctx.meta);
		expect(res.payload.timeout).toBe(1500);
		expect(res.payload.metrics).toBe(true);
		expect(res.payload.parentID).toBe("999");
	});		

	it("should serialize the response packet with data", () => {
		const data = [
			{ id: 1, name: "John" },
			{ id: 2, name: "Jane" }
		];
		const packet = new P.PacketResponse(broker.transit, "test-2", "12345", data);
		const s = packet.serialize();
		expect(s.length).toBe(66);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_RESPONSE, s);
		expect(res).toBeInstanceOf(P.PacketResponse);
		expect(res.payload.id).toBe("12345");
		expect(res.payload.data).toEqual(data);
	});		

	it("should serialize the response packet with error", () => {
		const err = new ValidationError("Invalid email!", { a: 5 });
		err.stack = "STACK_PLACEHOLDER";

		const packet = new P.PacketResponse(broker.transit, "test-2", "12345", null, err);
		const s = packet.serialize(100);
		expect(s.length).toBe(91);

		const res = P.Packet.deserialize(broker.transit, P.PACKET_RESPONSE, s);
		expect(res).toBeInstanceOf(P.PacketResponse);
		expect(res.payload.id).toBe("12345");
		expect(res.payload.error).toEqual({
			name: "ValidationError",
			message: "Invalid email!",
			code: 422,
			stack: "STACK_PLACEHOLDER",
			nodeID: "test-1",
			data: {
				a: 5
			}
		});
	});		

});