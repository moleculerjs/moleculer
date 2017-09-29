"use strict";

const { protectReject } = require("./utils");
const ServiceBroker = require("../../src/service-broker");
const Context = require("../../src/context");
const Transit = require("../../src/transit");
const FakeTransporter = require("../../src/transporters/fake");
const { ValidationError, ProtocolVersionMismatchError } = require("../../src/errors");
const P = require("../../src/packets");

describe("Test Transporter constructor", () => {

	const broker = new ServiceBroker();
	const transporter = new FakeTransporter();

	it("create instance", () => {
		let transit = new Transit(broker, transporter);
		expect(transit).toBeDefined();
		expect(transit.opts).toBeUndefined();
		expect(transit.logger).toBeDefined();
		expect(transit.nodeID).toBe(broker.nodeID);
		expect(transit.pendingRequests).toBeInstanceOf(Map);
		expect(transit.stat).toEqual({
			packets: {
				sent: 0,
				received: 0
			}
		});

		expect(transit.connected).toBe(false);
		expect(transit.disconnecting).toBe(false);

		expect(transit.tx).toBe(transporter);
	});

	it("create instance with options", () => {
		let opts = { id: 5 };
		let transit = new Transit(broker, transporter, opts);
		expect(transit).toBeDefined();
		expect(transit.opts).toBe(opts);
	});

	it("should call transporter.init", () => {
		transporter.init = jest.fn();
		let transit = new Transit(broker, transporter);

		expect(transporter.init).toHaveBeenCalledTimes(1);
		expect(transporter.init).toHaveBeenCalledWith(transit, jasmine.any(Function), jasmine.any(Function));
	});
});

describe("Test Transit.connect", () => {

	const broker = new ServiceBroker();
	const transporter = new FakeTransporter();
	const transit = new Transit(broker, transporter);

	transporter.connect = jest.fn(() => Promise.resolve());

	it("should call transporter connect", () => {
		let p = transit.connect().catch(protectReject).then(() => {
			expect(transporter.connect).toHaveBeenCalledTimes(1);

			expect(transit.__connectResolve).toBeDefined();
		});

		transit.__connectResolve();

		return p;
	});

	/* not working
	it("should recall transporter connect if failed", () => {
		let clock = lolex.install();
		transporter.connect = jest.fn()
			.mockImplementationOnce(() => Promise.reject())
			.mockImplementationOnce(() => Promise.resolve());

		let p = transit.connect().then(() => {
			expect(transporter.connect).toHaveBeenCalledTimes(2);

			clock.uninstall();
		});

		clock.runAll();

		return p;
	});
	*/

});

describe("Test Transit.afterConnect", () => {

	const broker = new ServiceBroker();
	const transporter = new FakeTransporter();
	const transit = new Transit(broker, transporter);

	let resolver;

	broker.broadcastLocal = jest.fn();

	beforeEach(() => {
		resolver = jest.fn();
		transit.__connectResolve = resolver;
		transit.makeSubscriptions = jest.fn(() => Promise.resolve());
		transit.discoverNodes = jest.fn(() => Promise.resolve());
	});

	it("should call makeSubscriptions & discoverNodes", () => {
		return transit.afterConnect().catch(protectReject).then(() => {
			expect(transit.makeSubscriptions).toHaveBeenCalledTimes(1);
			expect(transit.discoverNodes).toHaveBeenCalledTimes(1);
			expect(resolver).toHaveBeenCalledTimes(1);
			expect(transit.__connectResolve).toBeNull();
			expect(transit.connected).toBe(true);
			expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
			expect(broker.broadcastLocal).toHaveBeenCalledWith("$transporter.connected");
		});
	});

	it("should call only discoverNodes if was reconnected", () => {
		broker.broadcastLocal.mockClear();

		return transit.afterConnect(true).catch(protectReject).then(() => {
			expect(transit.makeSubscriptions).toHaveBeenCalledTimes(0);
			expect(transit.discoverNodes).toHaveBeenCalledTimes(1);
			expect(resolver).toHaveBeenCalledTimes(1);
			expect(transit.__connectResolve).toBeNull();
			expect(transit.connected).toBe(true);
			expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
			expect(broker.broadcastLocal).toHaveBeenCalledWith("$transporter.connected");
		});
	});

});

describe("Test Transit.disconnect", () => {

	const broker = new ServiceBroker();
	const transporter = new FakeTransporter();
	const transit = new Transit(broker, transporter);

	transporter.disconnect = jest.fn(() => Promise.resolve());
	transit.sendDisconnectPacket = jest.fn(() => Promise.resolve());
	broker.broadcastLocal = jest.fn();

	transit.connect();

	it("should call transporter disconnect & sendDisconnectPacket", () => {
		broker.broadcastLocal.mockClear();
		expect(transit.connected).toBe(true);
		expect(transit.disconnecting).toBe(false);
		return transit.disconnect().catch(protectReject).then(() => {
			expect(transporter.disconnect).toHaveBeenCalledTimes(1);
			expect(transit.sendDisconnectPacket).toHaveBeenCalledTimes(1);

			expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
			expect(broker.broadcastLocal).toHaveBeenCalledWith("$transporter.disconnected", { graceFul: true });

			expect(transit.connected).toBe(false);
			expect(transit.disconnecting).toBe(true);
		});
	});

});

describe("Test Transit.sendDisconnectPacket", () => {

	const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
	const transit = broker.transit;

	transit.publish = jest.fn(() => Promise.resolve());

	it("should call publish iwth correct params", () => {
		return transit.sendDisconnectPacket().catch(protectReject).then(() => {
			expect(transit.publish).toHaveBeenCalledTimes(1);
			expect(transit.publish).toHaveBeenCalledWith(jasmine.any(P.PacketDisconnect));
		});
	});

});

describe("Test Transit.makeSubscriptions", () => {

	const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
	const transit = broker.transit;

	transit.subscribe = jest.fn(() => Promise.resolve());

	it("should call subscribe with all topics", () => {
		return transit.makeSubscriptions().catch(protectReject).then(() => {
			expect(transit.subscribe).toHaveBeenCalledTimes(12);
			expect(transit.subscribe).toHaveBeenCalledWith("EVENT", "node1");
			expect(transit.subscribe).toHaveBeenCalledWith("REQ", "node1");
			expect(transit.subscribe).toHaveBeenCalledWith("RES", "node1");
			expect(transit.subscribe).toHaveBeenCalledWith("DISCOVER");
			expect(transit.subscribe).toHaveBeenCalledWith("DISCOVER", "node1");
			expect(transit.subscribe).toHaveBeenCalledWith("INFO");
			expect(transit.subscribe).toHaveBeenCalledWith("INFO", "node1");
			expect(transit.subscribe).toHaveBeenCalledWith("DISCONNECT");
			expect(transit.subscribe).toHaveBeenCalledWith("HEARTBEAT");
			expect(transit.subscribe).toHaveBeenCalledWith("PING");
			expect(transit.subscribe).toHaveBeenCalledWith("PING", "node1");
			expect(transit.subscribe).toHaveBeenCalledWith("PONG", "node1");
		});
	});

});

describe("Test Transit.sendEvent", () => {

	const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
	const transit = broker.transit;

	transit.publish = jest.fn();

	it("should call publish with correct params", () => {
		const user = { id: 5, name: "Jameson" };
		transit.sendEvent("node2", "user.created", user);
		expect(transit.publish).toHaveBeenCalledTimes(1);
		const packet = transit.publish.mock.calls[0][0];
		expect(packet).toBeInstanceOf(P.PacketEvent);
		expect(packet.target).toBe("node2");
		expect(packet.payload.event).toBe("user.created");
		expect(packet.payload.data).toBe(user);
		expect(packet.payload.groups).toBeNull();
	});

});

describe("Test Transit.sendBalancedEvent", () => {

	const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
	const transit = broker.transit;

	transit.publish = jest.fn();

	it("should call publish with correct params", () => {
		const user = { id: 5, name: "Jameson" };
		transit.sendBalancedEvent("user.created", user, {
			"node-2": ["users", "payments"],
			"node-4": ["mail"]
		});
		expect(transit.publish).toHaveBeenCalledTimes(2);

		const packet1 = transit.publish.mock.calls[0][0];
		expect(packet1).toBeInstanceOf(P.PacketEvent);
		expect(packet1.target).toBe("node-2");
		expect(packet1.payload.event).toBe("user.created");
		expect(packet1.payload.data).toBe(user);
		expect(packet1.payload.groups).toEqual(["users", "payments"]);

		const packet2 = transit.publish.mock.calls[1][0];
		expect(packet2).toBeInstanceOf(P.PacketEvent);
		expect(packet2.target).toBe("node-4");
		expect(packet2.payload.event).toBe("user.created");
		expect(packet2.payload.data).toBe(user);
		expect(packet2.payload.groups).toEqual(["mail"]);
	});

});

describe("Test Transit.sendEventToGroups", () => {

	const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
	const transit = broker.transit;

	broker.getEventGroups = jest.fn(() => ["users", "payments"]);
	transit.publish = jest.fn();

	it("should call publish with correct params", () => {
		const user = { id: 5, name: "Jameson" };
		transit.sendEventToGroups("user.created", user);
		expect(transit.publish).toHaveBeenCalledTimes(1);
		const packet = transit.publish.mock.calls[0][0];
		expect(packet).toBeInstanceOf(P.PacketEvent);
		expect(packet.target).toBeNull();
		expect(packet.payload.event).toBe("user.created");
		expect(packet.payload.data).toBe(user);
		expect(packet.payload.groups).toEqual(["users", "payments"]);

		expect(broker.getEventGroups).toHaveBeenCalledTimes(1);
		expect(broker.getEventGroups).toHaveBeenCalledWith("user.created");
	});

	it("should call publish with groups", () => {
		broker.getEventGroups.mockClear();
		transit.publish.mockClear();
		const user = { id: 5, name: "Jameson" };
		transit.sendEventToGroups("user.created", user, ["users", "mail"]);
		expect(transit.publish).toHaveBeenCalledTimes(1);
		const packet = transit.publish.mock.calls[0][0];
		expect(packet).toBeInstanceOf(P.PacketEvent);
		expect(packet.target).toBeNull();
		expect(packet.payload.event).toBe("user.created");
		expect(packet.payload.data).toBe(user);
		expect(packet.payload.groups).toEqual(["users", "mail"]);

		expect(broker.getEventGroups).toHaveBeenCalledTimes(0);
	});
});

describe("Test Transit.messageHandler", () => {

	let broker;
	let transit;

	// transit.subscribe = jest.fn();

	beforeEach(() => {
		broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
		transit = broker.transit;
	});

	it("should throw Error if msg not valid", () => {
		expect(transit.stat.packets.received).toBe(0);
		expect(transit.messageHandler("EVENT")).toBe(false);
	});

	it("should throw Error if version mismatch", () => {
		expect(transit.messageHandler("EVENT", "{}")).toBe(false);
	});

	it("should throw Error if version mismatch", () => {
		expect(transit.messageHandler("EVENT", "{\"ver\": \"1\"}")).toBe(false);
	});

	it("should call _requestHandler if topic is 'REQ' ", () => {
		transit._requestHandler = jest.fn();

		let msg = { ver: "2", sender: "remote", action: "posts.find", id: "123", params: { limit: 5 }, meta: { b: 100 }, parentID: "555", level: 5, metrics: true, requestID: "123456", timeout: 567 };
		transit.messageHandler("REQ", JSON.stringify(msg));

		expect(transit._requestHandler).toHaveBeenCalledTimes(1);
		expect(transit._requestHandler).toHaveBeenCalledWith(msg);
	});

	it("should call _requestHandler if topic is 'REQ' && sender is itself", () => {
		transit._requestHandler = jest.fn();

		let msg = { ver: "2", sender: broker.nodeID, action: "posts.find", id: "123", params: { limit: 5 }, meta: { b: 100 }, parentID: "555", level: 5, metrics: true, requestID: "123456", timeout: 567 };
		transit.messageHandler("REQ", JSON.stringify(msg));

		expect(transit._requestHandler).toHaveBeenCalledTimes(1);
		expect(transit._requestHandler).toHaveBeenCalledWith(msg);
	});

	it("should call _responseHandler if topic is 'RES' ", () => {
		transit._responseHandler = jest.fn();

		let msg = { ver: "2", sender: "remote", id: "12345" };
		transit.messageHandler("RES", JSON.stringify(msg));

		expect(transit._responseHandler).toHaveBeenCalledTimes(1);
		expect(transit._responseHandler).toHaveBeenCalledWith(msg);
	});

	it("should call _responseHandler if topic is 'RES' && sender is itself", () => {
		transit._responseHandler = jest.fn();

		let msg = { ver: "2", sender: broker.nodeID, id: "12345" };
		transit.messageHandler("RES", JSON.stringify(msg));

		expect(transit._responseHandler).toHaveBeenCalledTimes(1);
		expect(transit._responseHandler).toHaveBeenCalledWith(msg);
	});

	it("should call __eventHandler if topic is 'EVENT' ", () => {
		transit._eventHandler = jest.fn();

		let msg = { ver: "2", sender: "remote", event: "user.created", data: "John Doe" };
		transit.messageHandler("EVENT", JSON.stringify(msg));

		expect(transit._eventHandler).toHaveBeenCalledTimes(1);
		expect(transit._eventHandler).toHaveBeenCalledWith(msg);
	});

	it("should call __eventHandler if topic is 'EVENT' && sender is itself", () => {
		transit._eventHandler = jest.fn();

		let msg = { ver: "2", sender: broker.nodeID, event: "user.created", data: "John Doe" };
		transit.messageHandler("EVENT", JSON.stringify(msg));

		expect(transit._eventHandler).toHaveBeenCalledTimes(1);
		expect(transit._eventHandler).toHaveBeenCalledWith(msg);
	});

	it("should call broker.processNodeInfo & sendNodeInfo if topic is 'DISCOVER' ", () => {
		broker.registry.nodes.processNodeInfo = jest.fn();
		transit.sendNodeInfo = jest.fn();

		let msg = { ver: "2", sender: "remote", services: JSON.stringify([]) };
		transit.messageHandler("DISCOVER", JSON.stringify(msg));
		expect(transit.sendNodeInfo).toHaveBeenCalledTimes(1);
		expect(transit.sendNodeInfo).toHaveBeenCalledWith("remote");
	});

	it("should call broker.registry.nodes.processNodeInfo if topic is 'INFO' ", () => {
		broker.registry.nodes.processNodeInfo = jest.fn();

		let msg = { ver: "2", sender: "remote", services: [] };
		transit.messageHandler("INFO", JSON.stringify(msg));

		expect(broker.registry.nodes.processNodeInfo).toHaveBeenCalledTimes(1);
		expect(broker.registry.nodes.processNodeInfo).toHaveBeenCalledWith(msg);
	});

	it("should call broker.registry.nodes.disconnected if topic is 'DISCONNECT' ", () => {
		broker.registry.nodes.disconnected = jest.fn();

		let msg = { ver: "2", sender: "remote" };
		transit.messageHandler("DISCONNECT", JSON.stringify(msg));

		expect(broker.registry.nodes.disconnected).toHaveBeenCalledTimes(1);
		expect(broker.registry.nodes.disconnected).toHaveBeenCalledWith(msg.sender, false);
	});

	it("should call broker.registry.nodes.heartbeat if topic is 'HEARTBEAT' ", () => {
		broker.registry.nodes.heartbeat = jest.fn();

		let msg = { ver: "2", sender: "remote", cpu: 100 };
		transit.messageHandler("HEARTBEAT", JSON.stringify(msg));

		expect(broker.registry.nodes.heartbeat).toHaveBeenCalledTimes(1);
		expect(broker.registry.nodes.heartbeat).toHaveBeenCalledWith(msg);
	});

	it("should call broker.registry.nodes.heartbeat if topic is 'PING' ", () => {
		transit.sendPong = jest.fn();

		let msg = { ver: "2", sender: "remote", time: 1234567 };
		transit.messageHandler("PING", JSON.stringify(msg));

		expect(transit.sendPong).toHaveBeenCalledTimes(1);
		expect(transit.sendPong).toHaveBeenCalledWith(msg);
	});

	it("should call broker.registry.nodes.heartbeat if topic is 'PONG' ", () => {
		transit.processPong = jest.fn();

		let msg = { ver: "2", sender: "remote", time: 1234567, arrived: 7654321 };
		transit.messageHandler("PONG", JSON.stringify(msg));

		expect(transit.processPong).toHaveBeenCalledTimes(1);
		expect(transit.processPong).toHaveBeenCalledWith(msg);
	});

	it("should skip processing if sender is itself", () => {
		transit.sendPong = jest.fn();

		let msg = { ver: "2", sender: broker.nodeID, time: 1234567 };
		transit.messageHandler("PING", JSON.stringify(msg));

		expect(transit.sendPong).toHaveBeenCalledTimes(0);
	});

});

describe("Test Transit._requestHandler", () => {

	const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
	const transit = broker.transit;

	transit.sendResponse = jest.fn();

	it("should call broker._handleRemoteRequest & sendResponse with result", () => {
		let response = [1, 5, 8];
		broker._handleRemoteRequest = jest.fn(() => Promise.resolve(response));

		let payload = { ver: "2", sender: "remote", action: "posts.find", id: "123", params: { limit: 5 }, meta: { b: 100 }, parentID: "555", level: 5, metrics: true, requestID: "123456", timeout: 567 };

		transit._requestHandler(payload);
		const ctx = broker._handleRemoteRequest.mock.calls[0][0];

		expect(broker._handleRemoteRequest).toHaveBeenCalledTimes(1);
		expect(broker._handleRemoteRequest).toHaveBeenCalledWith(ctx);

		// Check context props
		expect(ctx).toBeInstanceOf(Context);
		expect(ctx.id).toBe("123");
		expect(ctx.parentID).toBe("555");
		expect(ctx.requestID).toBe("123456");
		expect(ctx.action.name).toBe("posts.find");
		expect(ctx.params).toEqual({ limit: 5 });
		expect(ctx.meta).toEqual({ b: 100 });
		expect(ctx.metrics).toBe(true);
		expect(ctx.level).toBe(5);
		expect(ctx.timeout).toBe(567);

		//expect(transit.sendResponse).toHaveBeenCalledTimes(1);
		//expect(transit.sendResponse).toHaveBeenCalledWith("remote", "123", [1, 5, 8], null);

	});

	it("should call broker._handleRemoteRequest & sendResponse with error", () => {
		transit.sendResponse.mockClear();
		broker._handleRemoteRequest = jest.fn(() => Promise.reject(new ValidationError("Not valid params")));

		let payload = { ver: "2", sender: "remote", action: "posts.create", id: "123", params: { title: "Hello" }, meta: {} };
		transit._requestHandler(payload);
		const ctx = broker._handleRemoteRequest.mock.calls[0][0];

		expect(broker._handleRemoteRequest).toHaveBeenCalledTimes(1);
		expect(broker._handleRemoteRequest).toHaveBeenCalledWith(ctx);

		// Check context props
		expect(ctx).toBeInstanceOf(Context);
		expect(ctx.id).toBe("123");
		expect(ctx.params).toEqual({"title": "Hello"});
		expect(ctx.meta).toEqual({});

		/*return promise.catch(protectReject).then(() => {
			expect(transit.sendResponse).toHaveBeenCalledTimes(1);
			expect(transit.sendResponse).toHaveBeenCalledWith("remote", "123", null, jasmine.any(ValidationError));
		});*/
	});
});

describe("Test Transit._responseHandler", () => {

	const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
	const transit = broker.transit;

	let id = "12345";

	it("should not call resolve or reject if pending req is not exists", () => {
		let req = { resolve: jest.fn(), reject: jest.fn() };
		let payload = { ver: "2", sender: "remote", id };

		transit._responseHandler(payload);
		expect(req.resolve).toHaveBeenCalledTimes(0);
		expect(req.reject).toHaveBeenCalledTimes(0);

	});

	it("should call resolve with data", () => {
		let data = { id: 5, name: "John" };
		let req = {
			action: { name: "posts.find" },
			ctx: { nodeID: null },
			resolve: jest.fn(() => Promise.resolve()),
			reject: jest.fn(() => Promise.resolve())
		};
		transit.pendingRequests.set(id, req);

		let payload = { ver: "2", sender: "remote", id, success: true, data };
		transit._responseHandler(payload);
		expect(req.resolve).toHaveBeenCalledTimes(1);
		expect(req.resolve).toHaveBeenCalledWith(data);
		expect(req.reject).toHaveBeenCalledTimes(0);
		expect(req.ctx.nodeID).toBe("remote");

		expect(transit.pendingRequests.size).toBe(0);

	});

	it("should call reject with error", () => {
		let err;
		let req = {
			action: { name: "posts.find" },
			ctx: { nodeID: null },
			resolve: jest.fn(),
			reject: jest.fn(e => err = e)
		};
		transit.pendingRequests.set(id, req);

		let payload = { ver: "2", sender: "remote", id, success: false, error: {
			name: "ValidationError",
			code: 422,
			data: { a: 5 },
			stack: "STACK-TRACE"
		}};

		transit._responseHandler(payload);
		expect(req.reject).toHaveBeenCalledTimes(1);
		expect(req.reject).toHaveBeenCalledWith(err);
		expect(req.resolve).toHaveBeenCalledTimes(0);
		expect(req.ctx.nodeID).toBe("remote");

		expect(err.name).toBe("ValidationError");
		expect(err.code).toBe(422);
		expect(err.data).toEqual({ a: 5 });
		expect(err.stack).toBe("STACK-TRACE");
		expect(err.nodeID).toBe("remote");

		expect(transit.pendingRequests.size).toBe(0);

	});
});

describe("Test Transit._eventHandler", () => {

	const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
	const transit = broker.transit;

	broker.emitLocalServices = jest.fn();
	it("should create packet", () => {
		transit._eventHandler({
			event: "user.created",
			data: { a: 5 },
			groups: ["users"],
			sender: "node-1"
		});

		expect(broker.emitLocalServices).toHaveBeenCalledTimes(1);
		expect(broker.emitLocalServices).toHaveBeenCalledWith("user.created", {"a": 5}, ["users"], "node-1");
	});

});

describe("Test Transit.request", () => {

	const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
	const transit = broker.transit;

	it("should create packet", () => {
		let ctx = new Context(broker, { name: "users.find" });
		ctx.nodeID = "remote";
		ctx.params = { a: 5 };
		ctx.meta = {
			user: {
				id: 5,
				roles: [ "user" ]
			}
		},
		ctx.timeout = 500;
		ctx.id = "12345";
		ctx.requestID = "1111";

		transit.publish = jest.fn(() => {
			let req = transit.pendingRequests.get("12345");
			return req.resolve(req);
		});

		return transit.request(ctx).catch(protectReject).then(req => {
			expect(transit.pendingRequests.size).toBe(1);
			expect(transit.publish).toHaveBeenCalledTimes(1);

			const packet = transit.publish.mock.calls[0][0];
			expect(packet).toBeInstanceOf(P.PacketRequest);
			expect(packet.payload.id).toBe("12345");
			expect(packet.payload.requestID).toBe("1111");
			expect(packet.payload.action).toBe("users.find");
			expect(packet.payload.params).toBe(ctx.params);
			expect(packet.payload.meta).toBe(ctx.meta);
			expect(packet.payload.timeout).toBe(500);

			expect(req.ctx).toBe(ctx);
			expect(req.resolve).toBeInstanceOf(Function);
			expect(req.reject).toBeInstanceOf(Function);
		});

	});

});

describe("Test Transit.sendResponse", () => {

	const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
	const transit = broker.transit;

	transit.publish = jest.fn();

	it("should call publish with the data", () => {
		const data = { id: 1, name: "John Doe" };
		transit.sendResponse("node2", "12345", data);
		expect(transit.publish).toHaveBeenCalledTimes(1);
		const packet = transit.publish.mock.calls[0][0];
		expect(packet).toBeInstanceOf(P.PacketResponse);
		expect(packet.target).toBe("node2");
		expect(packet.payload.id).toBe("12345");
		expect(packet.payload.success).toBe(true);
		expect(packet.payload.data).toBe(data);
	});

	it("should call publish with the error", () => {
		transit.publish.mockClear();
		transit.sendResponse("node2", "12345", null, new ValidationError("Not valid params", "ERR_INVALID_A_PARAM", { a: "Too small" }));
		expect(transit.publish).toHaveBeenCalledTimes(1);
		const packet = transit.publish.mock.calls[0][0];
		expect(packet).toBeInstanceOf(P.PacketResponse);
		expect(packet.target).toBe("node2");
		expect(packet.payload.id).toBe("12345");
		expect(packet.payload.success).toBe(false);
		expect(packet.payload.data).toBeNull();
		expect(packet.payload.error).toBeDefined();
		expect(packet.payload.error.name).toBe("ValidationError");
		expect(packet.payload.error.message).toBe("Not valid params");
		expect(packet.payload.error.code).toBe(422);
		expect(packet.payload.error.type).toBe("ERR_INVALID_A_PARAM");
		expect(packet.payload.error.nodeID).toBe("node1");
		expect(packet.payload.error.data).toEqual({ a: "Too small" });
	});

});

describe("Test Transit.discoverNodes", () => {

	const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
	const transit = broker.transit;

	transit.publish = jest.fn();

	it("should call publish with correct params", () => {
		transit.discoverNodes();
		expect(transit.publish).toHaveBeenCalledTimes(1);
		const packet = transit.publish.mock.calls[0][0];
		expect(packet).toBeInstanceOf(P.PacketDiscover);
		expect(packet.payload).toEqual({ sender: "node1", ver: "2" });
	});

});

describe("Test Transit.discoverNode", () => {

	const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
	const transit = broker.transit;

	transit.publish = jest.fn();

	it("should call publish with correct params", () => {
		transit.discoverNode("node-2");
		expect(transit.publish).toHaveBeenCalledTimes(1);
		const packet = transit.publish.mock.calls[0][0];
		expect(packet).toBeInstanceOf(P.PacketDiscover);
		expect(packet.target).toBe("node-2");
		expect(packet.payload).toEqual({ sender: "node1", ver: "2" });
	});

});

describe("Test Transit.sendNodeInfo", () => {

	const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter(), internalServices: false });
	const transit = broker.transit;
	broker.getLocalNodeInfo = jest.fn(() => ({
		id: "node2",
		services: []
	}));

	transit.tx._makeServiceSpecificSubscriptions = jest.fn(() => Promise.resolve());
	transit.publish = jest.fn();

	it("should call publish with correct params if has nodeID", () => {
		return transit.sendNodeInfo("node2").then(() => {
			expect(transit.tx._makeServiceSpecificSubscriptions).toHaveBeenCalledTimes(0);
			expect(transit.publish).toHaveBeenCalledTimes(1);
			expect(broker.getLocalNodeInfo).toHaveBeenCalledTimes(1);
			const packet = transit.publish.mock.calls[0][0];
			expect(packet).toBeInstanceOf(P.PacketInfo);
			expect(packet.target).toBe("node2");
			expect(packet.payload.services).toEqual([]);
		});
	});

	it("should call publish with correct params if has no nodeID", () => {
		transit.publish.mockClear();
		broker.getLocalNodeInfo.mockClear();

		return transit.sendNodeInfo().then(() => {
			expect(transit.tx._makeServiceSpecificSubscriptions).toHaveBeenCalledTimes(1);
			expect(transit.publish).toHaveBeenCalledTimes(1);
			expect(broker.getLocalNodeInfo).toHaveBeenCalledTimes(1);
			const packet = transit.publish.mock.calls[0][0];
			expect(packet).toBeInstanceOf(P.PacketInfo);
			expect(packet.target).toBe();
			expect(packet.payload.services).toEqual([]);
		});
	});

});

describe("Test Transit.sendPing", () => {

	const broker = new ServiceBroker({ nodeID: "node-1", transporter: new FakeTransporter() });
	const transit = broker.transit;

	transit.publish = jest.fn();

	it("should call publish with correct params", () => {
		transit.sendPing("node-2");
		expect(transit.publish).toHaveBeenCalledTimes(1);
		const packet = transit.publish.mock.calls[0][0];
		expect(packet).toBeInstanceOf(P.PacketPing);
		expect(packet.target).toBe("node-2");
		expect(packet.payload).toEqual({ sender: "node-1", ver: "2", time: jasmine.any(Number) });
	});

});

describe("Test Transit.sendPong", () => {

	const broker = new ServiceBroker({ nodeID: "node-1", transporter: new FakeTransporter() });
	const transit = broker.transit;

	transit.publish = jest.fn();

	it("should call publish with correct params", () => {
		transit.sendPong({ sender: "node-2", time: 123456 });
		expect(transit.publish).toHaveBeenCalledTimes(1);
		const packet = transit.publish.mock.calls[0][0];
		expect(packet).toBeInstanceOf(P.PacketPong);
		expect(packet.target).toBe("node-2");
		expect(packet.payload).toEqual({ sender: "node-1", ver: "2", time: 123456, arrived: jasmine.any(Number) });
	});

});

describe("Test Transit.processPong", () => {

	const broker = new ServiceBroker({ nodeID: "node-1", transporter: new FakeTransporter() });
	const transit = broker.transit;

	broker.broadcastLocal = jest.fn();

	it("should call broadcastLocal with ping result", () => {
		let now = Date.now();
		transit.processPong({ sender: "node-2", arrived: now, time: now - 500 });

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$node.pong", {"elapsedTime": jasmine.any(Number), "nodeID": "node-2", "timeDiff": jasmine.any(Number)}, "node-2");
	});

});

describe("Test Transit.sendHeartbeat", () => {

	const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
	const transit = broker.transit;

	transit.publish = jest.fn();

	it("should call publish with correct params", () => {
		transit.sendHeartbeat({ cpu: 12 });
		expect(transit.publish).toHaveBeenCalledTimes(1);
		const packet = transit.publish.mock.calls[0][0];
		expect(packet).toBeInstanceOf(P.PacketHeartbeat);
		expect(packet.payload.cpu).toBe(12);
	});

});

describe("Test Transit.subscribe", () => {

	const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
	const transit = broker.transit;
	const transporter = transit.tx;

	transporter.subscribe = jest.fn();

	it("should call transporter.subscribe", () => {
		transit.subscribe("REQ", "node-2");
		expect(transporter.subscribe).toHaveBeenCalledTimes(1);
		expect(transporter.subscribe).toHaveBeenCalledWith("REQ", "node-2");
	});

});

describe("Test Transit.publish", () => {

	const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
	const transit = broker.transit;
	const transporter = transit.tx;

	transporter.prepublish = jest.fn();
	broker.serializer.serialize = jest.fn(o => JSON.stringify(o));

	it("should call transporter.prepublish", () => {
		expect(transit.stat.packets.sent).toBe(0);
		let packet = new P.PacketEvent("user.created", { a: "John Doe" });
		transit.publish(packet);
		expect(transporter.prepublish).toHaveBeenCalledTimes(1);
		const p = transporter.prepublish.mock.calls[0][0];
		expect(p).toBe(packet);
		expect(transit.stat.packets.sent).toBe(1);
	});

	it("should call transporter.prepublish after subscribing", () => {
		transporter.prepublish.mockClear();
		transit.stat.packets.sent = 0;
		let resolve;
		transit.subscribing = new Promise(r => resolve = r);

		expect(transit.stat.packets.sent).toBe(0);

		let packet = new P.PacketEvent("user.created", { a: "John Doe" });
		let p = transit.publish(packet);

		expect(transporter.prepublish).toHaveBeenCalledTimes(0);
		resolve();

		return p.catch(protectReject).then(() => {
			expect(transporter.prepublish).toHaveBeenCalledTimes(1);
			const p = transporter.prepublish.mock.calls[0][0];
			expect(p).toBe(packet);
			expect(transit.stat.packets.sent).toBe(1);
		});
	});

});

describe("Test Transit.serialize", () => {

	const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
	const transit = broker.transit;

	broker.serializer.serialize = jest.fn();

	it("should call broker.serializer.serialize", () => {
		let payload = { a: "John Doe" };
		transit.serialize(payload, P.PACKET_DISCOVER);
		expect(broker.serializer.serialize).toHaveBeenCalledTimes(1);
		expect(broker.serializer.serialize).toHaveBeenCalledWith(payload, P.PACKET_DISCOVER);
	});

});

describe("Test Transit.deserialize", () => {

	const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
	const transit = broker.transit;

	broker.serializer.deserialize = jest.fn();

	it("should not call broker.serializer.deserialize if null", () => {
		let res = transit.deserialize(null);
		expect(res).toBeNull();
		expect(broker.serializer.deserialize).toHaveBeenCalledTimes(0);
	});

	it("should call broker.serializer.deserialize", () => {
		let payload = { a: "John Doe" };
		transit.deserialize(payload, P.PACKET_DISCOVER);
		expect(broker.serializer.deserialize).toHaveBeenCalledTimes(1);
		expect(broker.serializer.deserialize).toHaveBeenCalledWith(payload, P.PACKET_DISCOVER);
	});

});

