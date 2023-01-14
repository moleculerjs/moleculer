"use strict";

const { protectReject } = require("./utils");
const ServiceBroker = require("../../src/service-broker");
const Context = require("../../src/context");
const Transit = require("../../src/transit");
const FakeTransporter = require("../../src/transporters/fake");
const E = require("../../src/errors");
const P = require("../../src/packets");
const C = require("../../src/constants");
const { Transform } = require("stream");
const Stream = require("stream");
const crypto = require("crypto");

const transitOptions = { packetLogFilter: [], disableReconnect: false };

describe("Test Transporter constructor", () => {
	const broker = new ServiceBroker({ logger: false });
	const transporter = new FakeTransporter();

	it("create instance", () => {
		let transit = new Transit(broker, transporter, transitOptions);
		expect(transit).toBeDefined();
		expect(transit.opts).toBe(transitOptions);
		expect(transit.logger).toBeDefined();
		expect(transit.nodeID).toBe(broker.nodeID);
		expect(transit.instanceID).toBe(broker.instanceID);
		expect(transit.tx).toBe(transporter);
		expect(transit.discoverer).toBe(broker.registry.discoverer);

		expect(transit.pendingRequests).toBeInstanceOf(Map);
		expect(transit.pendingReqStreams).toBeInstanceOf(Map);
		expect(transit.pendingResStreams).toBeInstanceOf(Map);

		expect(transit.connected).toBe(false);
		expect(transit.disconnecting).toBe(false);
		expect(transit.isReady).toBe(false);
	});

	it("create instance with options", () => {
		let opts = { id: 5 };
		let transit = new Transit(broker, transporter, opts);
		expect(transit.opts).toBe(opts);
	});

	it("should call transporter.init", () => {
		transporter.init = jest.fn();
		let transit = new Transit(broker, transporter, transitOptions);

		expect(transporter.init).toHaveBeenCalledTimes(1);
		expect(transporter.init).toHaveBeenCalledWith(
			transit,
			expect.any(Function),
			expect.any(Function)
		);
	});
});

describe("Test Transit.connect", () => {
	const broker = new ServiceBroker({ logger: false });
	const transporter = new FakeTransporter();
	const transit = new Transit(broker, transporter, transitOptions);

	transporter.connect = jest.fn(() => Promise.resolve());

	it("should call transporter connect", () => {
		let p = transit
			.connect()
			.catch(protectReject)
			.then(() => {
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
	const broker = new ServiceBroker({ logger: false, transporter: "Fake" });
	const transit = broker.transit;

	let resolver;

	broker.broadcastLocal = jest.fn();

	beforeEach(() => {
		resolver = jest.fn();
		transit.__connectResolve = resolver;
		transit.makeSubscriptions = jest.fn(() => Promise.resolve());
		transit.discoverer.discoverAllNodes = jest.fn(() => Promise.resolve());
		transit.discoverer.sendLocalNodeInfo = jest.fn(() => Promise.resolve());
	});

	it("should call makeSubscriptions & discoverNodes", () => {
		return transit
			.afterConnect()
			.catch(protectReject)
			.then(() => {
				expect(transit.makeSubscriptions).toHaveBeenCalledTimes(1);
				expect(transit.discoverer.discoverAllNodes).toHaveBeenCalledTimes(1);
				expect(transit.discoverer.sendLocalNodeInfo).toHaveBeenCalledTimes(0);
				expect(resolver).toHaveBeenCalledTimes(1);
				expect(transit.__connectResolve).toBeNull();
				expect(transit.connected).toBe(true);
				expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
				expect(broker.broadcastLocal).toHaveBeenCalledWith("$transporter.connected", {
					wasReconnect: false
				});
			});
	});

	it("should call sendNodeInfo & discoverNodes if was reconnected", () => {
		broker.broadcastLocal.mockClear();

		return transit
			.afterConnect(true)
			.catch(protectReject)
			.then(() => {
				expect(transit.makeSubscriptions).toHaveBeenCalledTimes(0);
				expect(transit.discoverer.sendLocalNodeInfo).toHaveBeenCalledTimes(1);
				expect(transit.discoverer.discoverAllNodes).toHaveBeenCalledTimes(1);
				expect(resolver).toHaveBeenCalledTimes(1);
				expect(transit.__connectResolve).toBeNull();
				expect(transit.connected).toBe(true);
				expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
				expect(broker.broadcastLocal).toHaveBeenCalledWith("$transporter.connected", {
					wasReconnect: true
				});
			});
	});
});

describe("Test Transit.disconnect", () => {
	const broker = new ServiceBroker({ logger: false, transporter: "Fake" });
	const transit = broker.transit;
	const transporter = transit.tx;

	broker.broadcastLocal = jest.fn();
	broker.metrics.set = jest.fn();
	transit.discoverer.localNodeDisconnected = jest.fn(() => Promise.resolve());

	beforeAll(() => transit.connect().then(() => transit.ready()));

	it("should call transporter disconnect & localNodeDisconnected", () => {
		transporter.disconnect = jest.fn(() => {
			expect(transit.disconnecting).toBe(true);
			return Promise.resolve();
		});
		broker.broadcastLocal.mockClear();
		broker.metrics.set.mockClear();
		transit.discoverer.localNodeDisconnected.mockClear();
		expect(transit.connected).toBe(true);
		expect(transit.isReady).toBe(true);
		expect(transit.disconnecting).toBe(false);
		return transit
			.disconnect()
			.catch(protectReject)
			.then(() => {
				expect(transporter.disconnect).toHaveBeenCalledTimes(1);

				expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
				expect(broker.broadcastLocal).toHaveBeenCalledWith("$transporter.disconnected", {
					graceFul: true
				});

				expect(broker.metrics.set).toHaveBeenCalledTimes(1);
				expect(broker.metrics.set).toHaveBeenCalledWith("moleculer.transit.connected", 0);

				expect(transit.discoverer.localNodeDisconnected).toHaveBeenCalledTimes(1);

				expect(transit.connected).toBe(false);
				expect(transit.isReady).toBe(false);
				expect(transit.disconnecting).toBe(false);
			});
	});
});

describe("Test Transit.sendDisconnectPacket", () => {
	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node1",
		transporter: new FakeTransporter()
	});
	const transit = broker.transit;

	transit.publish = jest.fn(() => Promise.resolve());

	it("should call publish with correct params", () => {
		return transit
			.sendDisconnectPacket()
			.catch(protectReject)
			.then(() => {
				expect(transit.publish).toHaveBeenCalledTimes(1);
				expect(transit.publish).toHaveBeenCalledWith(expect.any(P.Packet));
				const packet = transit.publish.mock.calls[0][0];
				expect(packet.type).toBe(P.PACKET_DISCONNECT);
				expect(packet.payload).toEqual({});
			});
	});
});

describe("Test Transit.makeSubscriptions", () => {
	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node1",
		transporter: new FakeTransporter()
	});
	const transit = broker.transit;

	transit.tx.makeSubscriptions = jest.fn(() => Promise.resolve());

	it("should call makeSubscriptions of transporter with all topics", () => {
		return transit
			.makeSubscriptions()
			.catch(protectReject)
			.then(() => {
				expect(transit.tx.makeSubscriptions).toHaveBeenCalledTimes(1);
				expect(transit.tx.makeSubscriptions).toHaveBeenCalledWith([
					{ cmd: "EVENT", nodeID: "node1" },
					{ cmd: "REQ", nodeID: "node1" },
					{ cmd: "RES", nodeID: "node1" },
					{ cmd: "DISCOVER" },
					{ cmd: "DISCOVER", nodeID: "node1" },
					{ cmd: "INFO" },
					{ cmd: "INFO", nodeID: "node1" },
					{ cmd: "DISCONNECT" },
					{ cmd: "HEARTBEAT" },
					{ cmd: "PING" },
					{ cmd: "PING", nodeID: "node1" },
					{ cmd: "PONG", nodeID: "node1" }
				]);
			});
	});
});

describe("Test Transit.messageHandler", () => {
	let broker;
	let transit;
	let broadcastLocalMock = jest.fn();

	// transit.subscribe = jest.fn();

	beforeEach(() => {
		broker = new ServiceBroker({
			logger: false,
			nodeID: "node1",
			transporter: new FakeTransporter()
		});

		broker.broadcastLocal = broadcastLocalMock;

		transit = broker.transit;
	});

	afterEach(() => {
		broadcastLocalMock.mockClear();
	});

	it("should broadcast Error if msg not valid", async () => {
		const res = await transit.messageHandler("EVENT");
		expect(res).toBe(false);

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$transit.error", {
			error: expect.any(Error),
			module: "transit",
			type: C.FAILED_PROCESSING_PACKET
		});
	});

	it("should broadcast Error if no version", async () => {
		const res = await transit.messageHandler("EVENT", { payload: {} });
		expect(res).toBe(false);

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$transit.error", {
			error: new E.ProtocolVersionMismatchError(),
			module: "transit",
			type: C.FAILED_PROCESSING_PACKET
		});
	});

	it("should broadcast Error if version mismatch", async () => {
		const res = await transit.messageHandler("EVENT", { payload: { ver: "1" } });
		expect(res).toBe(false);

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$transit.error", {
			error: new E.ProtocolVersionMismatchError(),
			module: "transit",
			type: C.FAILED_PROCESSING_PACKET
		});
	});

	it("should not throw Error if version mismatch & disableVersionCheck is true", async () => {
		transit.opts.disableVersionCheck = true;
		const payload = {
			ver: "1",
			sender: "remote",
			action: "posts.find",
			id: "123",
			params: { limit: 5 },
			meta: { b: 100 },
			parentID: "555",
			caller: null,
			level: 5,
			metrics: true,
			requestID: "123456",
			timeout: 567
		};
		const res = await transit.messageHandler("REQ", { payload });
		expect(res).toBe(true);
	});

	it("should call broker.fatal if nodeID is same but instanceID is different", async () => {
		broker.fatal = jest.fn();
		await transit.messageHandler("INFO", {
			payload: { ver: "4", sender: "node1", instanceID: "abcdef" }
		});
		expect(broker.fatal).toHaveBeenCalledTimes(1);
	});

	it("should skip own packets", async () => {
		broker.fatal = jest.fn();
		const res = await transit.messageHandler("INFO", {
			payload: { ver: "4", sender: "node1", instanceID: broker.instanceID }
		});
		expect(res).toBe(false);
		expect(broker.fatal).toHaveBeenCalledTimes(0);
	});

	it("should call requestHandler if topic is 'REQ' ", async () => {
		transit.requestHandler = jest.fn();

		let payload = {
			ver: "4",
			sender: "remote",
			action: "posts.find",
			id: "123",
			params: { limit: 5 },
			meta: { b: 100 },
			parentID: "555",
			caller: null,
			level: 5,
			metrics: true,
			requestID: "123456",
			timeout: 567
		};
		await transit.messageHandler("REQ", { payload });

		expect(transit.requestHandler).toHaveBeenCalledTimes(1);
		expect(transit.requestHandler).toHaveBeenCalledWith(payload);
	});

	it("should call requestHandler if topic is 'REQ' && sender is itself", async () => {
		transit.requestHandler = jest.fn();

		let payload = {
			ver: "4",
			sender: broker.nodeID,
			action: "posts.find",
			id: "123",
			params: { limit: 5 },
			meta: { b: 100 },
			parentID: "555",
			caller: null,
			level: 5,
			metrics: true,
			requestID: "123456",
			timeout: 567
		};
		await transit.messageHandler("REQ", { payload });

		expect(transit.requestHandler).toHaveBeenCalledTimes(1);
		expect(transit.requestHandler).toHaveBeenCalledWith(payload);
	});

	it("should call responseHandler if topic is 'RES' ", async () => {
		transit.responseHandler = jest.fn();

		let payload = { ver: "4", sender: "remote", id: "12345" };
		await transit.messageHandler("RES", { payload });

		expect(transit.responseHandler).toHaveBeenCalledTimes(1);
		expect(transit.responseHandler).toHaveBeenCalledWith(payload);
	});

	it("should call responseHandler if topic is 'RES' && sender is itself", async () => {
		transit.responseHandler = jest.fn();

		let payload = { ver: "4", sender: broker.nodeID, id: "12345" };
		await transit.messageHandler("RES", { payload });

		expect(transit.responseHandler).toHaveBeenCalledTimes(1);
		expect(transit.responseHandler).toHaveBeenCalledWith(payload);
	});

	it("should call eventHandler if topic is 'EVENT' ", async () => {
		transit.eventHandler = jest.fn();

		let payload = { ver: "4", sender: "remote", event: "user.created", data: "John Doe" };
		await transit.messageHandler("EVENT", { payload });

		expect(transit.eventHandler).toHaveBeenCalledTimes(1);
		expect(transit.eventHandler).toHaveBeenCalledWith(payload);
	});

	it("should call eventHandler if topic is 'EVENT' && sender is itself", async () => {
		transit.eventHandler = jest.fn();

		let payload = { ver: "4", sender: broker.nodeID, event: "user.created", data: "John Doe" };
		await transit.messageHandler("EVENT", { payload });

		expect(transit.eventHandler).toHaveBeenCalledTimes(1);
		expect(transit.eventHandler).toHaveBeenCalledWith(payload);
	});

	it("should call sendNodeInfo if topic is 'DISCOVER' ", async () => {
		broker.registry.nodes.processNodeInfo = jest.fn();
		transit.discoverer.sendLocalNodeInfo = jest.fn();

		let payload = { ver: "4", sender: "remote" };
		await transit.messageHandler("DISCOVER", { payload });
		expect(transit.discoverer.sendLocalNodeInfo).toHaveBeenCalledTimes(1);
		expect(transit.discoverer.sendLocalNodeInfo).toHaveBeenCalledWith("remote");
	});

	it("should call broker.registry.nodes.processNodeInfo if topic is 'INFO' ", async () => {
		transit.discoverer.processRemoteNodeInfo = jest.fn();

		let payload = { ver: "4", sender: "remote", services: [] };
		await transit.messageHandler("INFO", { payload });

		expect(transit.discoverer.processRemoteNodeInfo).toHaveBeenCalledTimes(1);
		expect(transit.discoverer.processRemoteNodeInfo).toHaveBeenCalledWith("remote", payload);
	});

	it("should call broker.registry.disconnected if topic is 'DISCONNECT' ", async () => {
		transit.discoverer.remoteNodeDisconnected = jest.fn();

		let payload = { ver: "4", sender: "remote" };
		await transit.messageHandler("DISCONNECT", { payload });

		expect(transit.discoverer.remoteNodeDisconnected).toHaveBeenCalledTimes(1);
		expect(transit.discoverer.remoteNodeDisconnected).toHaveBeenCalledWith("remote", false);
	});

	it("should call broker.registry.nodeHeartbeat if topic is 'HEARTBEAT' ", async () => {
		transit.discoverer.heartbeatReceived = jest.fn();

		let payload = { ver: "4", sender: "remote", cpu: 100 };
		await transit.messageHandler("HEARTBEAT", { payload });

		expect(transit.discoverer.heartbeatReceived).toHaveBeenCalledTimes(1);
		expect(transit.discoverer.heartbeatReceived).toHaveBeenCalledWith("remote", payload);
	});

	it("should call broker.registry.nodes.heartbeat if topic is 'PING' ", async () => {
		transit.sendPong = jest.fn();

		let payload = { ver: "4", sender: "remote", time: 1234567 };
		await transit.messageHandler("PING", { payload });

		expect(transit.sendPong).toHaveBeenCalledTimes(1);
		expect(transit.sendPong).toHaveBeenCalledWith(payload);
	});

	it("should call broker.registry.nodes.heartbeat if topic is 'PONG' ", async () => {
		transit.processPong = jest.fn();

		let payload = { ver: "4", sender: "remote", time: 1234567, arrived: 7654321 };
		await transit.messageHandler("PONG", { payload });

		expect(transit.processPong).toHaveBeenCalledTimes(1);
		expect(transit.processPong).toHaveBeenCalledWith(payload);
	});

	it("should skip processing if sender is itself", async () => {
		transit.sendPong = jest.fn();

		let payload = { ver: "4", sender: broker.nodeID, time: 1234567 };
		await transit.messageHandler("PING", { payload });

		expect(transit.sendPong).toHaveBeenCalledTimes(0);
	});
});

describe("Test Transit.eventHandler", () => {
	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node1",
		transporter: new FakeTransporter()
	});
	const transit = broker.transit;
	broker.emitLocalServices = jest.fn(() => Promise.resolve());

	it("should create packet", async () => {
		broker.emitLocalServices.mockClear();
		broker.stopping = false;
		await transit.eventHandler({
			id: "event-12345",
			requestID: "event-req-12345",
			parentID: "event-parent-67890",
			event: "user.created",
			data: { a: 5 },
			headers: { auth: false },
			groups: ["users"],
			sender: "node-1",
			broadcast: true
		});

		expect(broker.emitLocalServices).toHaveBeenCalledTimes(1);
		const ctx = broker.emitLocalServices.mock.calls[0][0];
		expect(broker.emitLocalServices).toHaveBeenCalledWith(ctx);
		expect(ctx.toJSON()).toEqual({
			id: "event-12345",
			ackID: null,
			cachedResult: false,
			caller: undefined,
			eventGroups: ["users"],
			eventName: "user.created",
			eventType: "broadcast",
			level: undefined,
			meta: {},
			headers: { auth: false },
			responseHeaders: {},
			needAck: null,
			nodeID: "node-1",
			options: {
				retries: null,
				timeout: null
			},
			params: {
				a: 5
			},
			parentID: "event-parent-67890",
			requestID: "event-req-12345",
			span: null,
			tracing: false
		});
	});

	it("should NOT create packet if broker is stopping", async () => {
		broker.emitLocalServices.mockClear();
		broker.stopping = true;
		await transit.eventHandler({
			id: "event-12345",
			requestID: "event-req-12345",
			parentID: "event-parent-67890",
			event: "user.created",
			data: { a: 5 },
			groups: ["users"],
			sender: "node-1",
			broadcast: true
		});

		expect(broker.emitLocalServices).toHaveBeenCalledTimes(0);
	});
});

describe("Test Transit.requestHandler", () => {
	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node1",
		transporter: new FakeTransporter()
	});
	const transit = broker.transit;
	transit._handleIncomingRequestStream = jest.fn();
	const ep = {
		action: {
			handler: jest.fn(() => Promise.resolve())
		}
	};
	broker._getLocalActionEndpoint = jest.fn(() => ep);
	transit.sendResponse = jest.fn(() => Promise.resolve());

	let id = "12345";

	it("should not call sendResponse if stream chunk is received", () => {
		transit.sendResponse.mockClear();
		transit._handleIncomingRequestStream = jest.fn(() => null);
		const payload = {
			sender: "node2",
			id,
			meta: { a: 5 },
			headers: { auth: false },
			action: "posts.find",
			stream: true,
			seq: 4
		};

		return transit
			.requestHandler(payload)
			.catch(protectReject)
			.then(() => {
				expect(transit.sendResponse).toHaveBeenCalledTimes(0);
				expect(transit._handleIncomingRequestStream).toHaveBeenCalledTimes(1);
				expect(transit._handleIncomingRequestStream).toHaveBeenCalledWith(payload);
			});
	});

	it("should call sendResponse with data", () => {
		transit.sendResponse.mockClear();
		transit._handleIncomingRequestStream.mockClear();

		let data = { id: 5, name: "John" };
		ep.action.handler = jest.fn(ctx => {
			ctx.responseHeaders.contentType = "json";
			return Promise.resolve(data);
		});

		const payload = {
			sender: "node2",
			id,
			action: "posts.find",
			params: { name: "John" },
			meta: { a: 5 },
			headers: { auth: false },
			parentID: "00000",
			requestID: "12345-54321",
			caller: "users.list",
			level: 3,
			tracing: true,
			timeout: 230
		};

		return transit
			.requestHandler(payload)
			.catch(protectReject)
			.then(() => {
				expect(transit._handleIncomingRequestStream).toHaveBeenCalledTimes(0);

				expect(transit.broker._getLocalActionEndpoint).toHaveBeenCalledTimes(1);
				expect(transit.broker._getLocalActionEndpoint).toHaveBeenCalledWith("posts.find");

				expect(ep.action.handler).toHaveBeenCalledTimes(1);
				expect(ep.action.handler).toHaveBeenCalledWith(expect.any(Context));
				const ctx = ep.action.handler.mock.calls[0][0];

				expect(ctx).toBeInstanceOf(Context);
				expect(ctx.id).toBe(id);
				expect(ctx.endpoint).toBe(ep);
				expect(ctx.action).toBe(ep.action);
				expect(ctx.params).toEqual({ name: "John" });
				expect(ctx.parentID).toBe("00000");
				expect(ctx.requestID).toBe("12345-54321");
				expect(ctx.caller).toBe("users.list");
				expect(ctx.meta).toEqual({ a: 5 });
				expect(ctx.level).toBe(3);
				expect(ctx.tracing).toBe(true);
				expect(ctx.nodeID).toBe("node2");
				expect(ctx.options.timeout).toBe(230);

				expect(transit.sendResponse).toHaveBeenCalledTimes(1);
				expect(transit.sendResponse).toHaveBeenCalledWith(
					"node2",
					id,
					{ a: 5 },
					{ contentType: "json" },
					data,
					null
				);
			});
	});

	it("should call sendResponse with correct tracing property", () => {
		transit.sendResponse.mockClear();
		transit.broker._getLocalActionEndpoint.mockClear();
		transit._handleIncomingRequestStream.mockClear();
		ep.action.handler.mockClear();

		let data = { id: 5, name: "John" };
		ep.action.handler = jest.fn(ctx => {
			ctx.responseHeaders.contentType = "json";
			return Promise.resolve(data);
		});

		const payload = {
			sender: "node2",
			id,
			action: "posts.find",
			params: { name: "John" },
			meta: { a: 5 },
			headers: { auth: false },
			parentID: "00000",
			requestID: "12345-54321",
			caller: "users.list",
			level: 3,
			tracing: null,
			timeout: 230
		};

		return transit
			.requestHandler(payload)
			.catch(protectReject)
			.then(() => {
				expect(transit._handleIncomingRequestStream).toHaveBeenCalledTimes(0);

				expect(transit.broker._getLocalActionEndpoint).toHaveBeenCalledTimes(1);
				expect(transit.broker._getLocalActionEndpoint).toHaveBeenCalledWith("posts.find");

				expect(ep.action.handler).toHaveBeenCalledTimes(1);
				expect(ep.action.handler).toHaveBeenCalledWith(expect.any(Context));
				const ctx = ep.action.handler.mock.calls[0][0];

				expect(ctx).toBeInstanceOf(Context);
				expect(ctx.id).toBe(id);
				expect(ctx.endpoint).toBe(ep);
				expect(ctx.action).toBe(ep.action);
				expect(ctx.params).toEqual({ name: "John" });
				expect(ctx.parentID).toBe("00000");
				expect(ctx.requestID).toBe("12345-54321");
				expect(ctx.caller).toBe("users.list");
				expect(ctx.meta).toEqual({ a: 5 });
				expect(ctx.headers).toEqual({ auth: false });
				expect(ctx.level).toBe(3);
				expect(ctx.tracing).toBeNull();
				expect(ctx.nodeID).toBe("node2");
				expect(ctx.options.timeout).toBe(230);

				expect(transit.sendResponse).toHaveBeenCalledTimes(1);
				expect(transit.sendResponse).toHaveBeenCalledWith(
					"node2",
					id,
					{ a: 5 },
					{ contentType: "json" },
					data,
					null
				);
			});
	});

	it("should call sendResponse with error", () => {
		transit.sendResponse.mockClear();
		broker._getLocalActionEndpoint.mockClear();
		const pass = { streaming: true };
		transit._handleIncomingRequestStream = jest.fn(() => pass);

		let err = new Error("Something went wrong");
		ep.action.handler = jest.fn(ctx => {
			ctx.responseHeaders.contentType = "json";
			return Promise.reject(err);
		});

		const payload = {
			sender: "node2",
			id,
			action: "posts.find",
			meta: { a: 5 },
			headers: { auth: false },
			parentID: "00000",
			requestID: "12345-54321",
			caller: null,
			level: 3,
			stream: false,
			tracing: true,
			timeout: 230
		};

		return transit
			.requestHandler(payload)
			.catch(protectReject)
			.then(() => {
				expect(transit._handleIncomingRequestStream).toHaveBeenCalledTimes(1);
				expect(transit._handleIncomingRequestStream).toHaveBeenCalledWith(payload);

				expect(transit.broker._getLocalActionEndpoint).toHaveBeenCalledTimes(1);
				expect(transit.broker._getLocalActionEndpoint).toHaveBeenCalledWith("posts.find");

				expect(ep.action.handler).toHaveBeenCalledTimes(1);
				expect(ep.action.handler).toHaveBeenCalledWith(expect.any(Context));
				const ctx = ep.action.handler.mock.calls[0][0];

				expect(ctx).toBeInstanceOf(Context);
				expect(ctx.id).toBe(id);
				expect(ctx.endpoint).toBe(ep);
				expect(ctx.action).toBe(ep.action);
				expect(ctx.params).toEqual({ streaming: true });
				expect(ctx.parentID).toBe("00000");
				expect(ctx.requestID).toBe("12345-54321");
				expect(ctx.caller).toBeNull();
				expect(ctx.meta).toEqual({ a: 5 });
				expect(ctx.headers).toEqual({ auth: false });
				expect(ctx.level).toBe(3);
				expect(ctx.tracing).toBe(true);
				expect(ctx.nodeID).toBe("node2");
				expect(ctx.options.timeout).toBe(230);

				expect(transit.sendResponse).toHaveBeenCalledTimes(1);
				expect(transit.sendResponse).toHaveBeenCalledWith(
					"node2",
					id,
					{ a: 5 },
					{ contentType: "json" },
					null,
					err
				);
			});
	});

	it("should not send back response if broker is stopping", () => {
		transit.sendResponse.mockClear();
		transit._handleIncomingRequestStream.mockClear();

		broker.stopping = true;
		return transit
			.requestHandler({
				sender: "node2",
				id,
				meta: { a: 5 },
				action: "posts.find"
			})
			.catch(protectReject)
			.then(() => {
				expect(transit.sendResponse).toHaveBeenCalledTimes(1);
				expect(transit.sendResponse).toHaveBeenCalledWith(
					"node2",
					id,
					{ a: 5 },
					null,
					null,
					expect.any(Error)
				);
				expect(transit._handleIncomingRequestStream).toHaveBeenCalledTimes(0);
				broker.started = true;
			});
	});
});

describe("Test Transit._handleIncomingRequestStream", () => {
	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node1",
		transporter: new FakeTransporter()
	});
	const transit = broker.transit;
	broker.started = true;

	describe("Test with non-stream data", () => {
		const payload = { ver: "4", sender: "remote", action: "posts.import", id: "123" };

		it("should return false", () => {
			const pass = transit._handleIncomingRequestStream(
				Object.assign({}, payload, { stream: false, seq: 0 })
			);
			expect(pass).toBe(false);
		});

		it("should return false", () => {
			const pass = transit._handleIncomingRequestStream(
				Object.assign({}, payload, { stream: false })
			);
			expect(pass).toBe(false);
		});

		it("should return false", () => {
			const pass = transit._handleIncomingRequestStream(payload);
			expect(pass).toBe(false);
		});
	});

	describe("Test with sequential chunks", () => {
		let STORE = [];
		const payload = { ver: "4", sender: "remote", action: "posts.import", id: "123" };

		it("should create new stream", () => {
			const pass = transit._handleIncomingRequestStream(
				Object.assign({}, payload, { stream: true, seq: 0 })
			);
			expect(pass).toBeInstanceOf(Transform);
			pass.on("data", data => STORE.push(data.toString()));
			pass.on("error", () => STORE.push("-- ERROR --"));
			pass.on("end", () => STORE.push("-- END --"));
		});

		it("should add chunks", () => {
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: true, seq: 1, params: "CHUNK-1" })
				)
			).toBeNull();
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: true, seq: 2, params: "CHUNK-2" })
				)
			).toBeNull();
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: true, seq: 3, params: "CHUNK-3" })
				)
			).toBeNull();
			expect(STORE).toEqual(["CHUNK-1", "CHUNK-2", "CHUNK-3"]);
		});

		it("should close the stream", () => {
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: false, seq: 4 })
				)
			).toBeNull();
			return broker.Promise.delay(100).then(() => {
				expect(STORE).toEqual(["CHUNK-1", "CHUNK-2", "CHUNK-3", "-- END --"]);
			});
		});
	});

	describe("Test with sequential chunks & error", () => {
		let STORE = [];
		const payload = { ver: "4", sender: "remote", action: "posts.import", id: "123" };
		const errorHandler = jest.fn(() => STORE.push("-- ERROR --"));

		it("should create new stream", () => {
			const pass = transit._handleIncomingRequestStream(
				Object.assign({}, payload, { stream: true, seq: 0 })
			);
			expect(pass).toBeInstanceOf(Transform);
			pass.on("data", data => STORE.push(data.toString()));
			pass.on("error", errorHandler);
			pass.on("end", () => STORE.push("-- END --"));
		});

		it("should add chunks", () => {
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: true, seq: 1, params: "CHUNK-1" })
				)
			).toBeNull();
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: true, seq: 2, params: "CHUNK-2" })
				)
			).toBeNull();
			expect(STORE).toEqual(["CHUNK-1", "CHUNK-2"]);
		});

		it("should got error", () => {
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, {
						stream: false,
						seq: 3,
						meta: {
							$streamError: { name: "MoleculerError", message: "Some stream error" }
						}
					})
				)
			).toBeNull();
			return broker.Promise.delay(100).then(() => {
				expect(STORE).toEqual(["CHUNK-1", "CHUNK-2", "-- ERROR --", "-- END --"]);

				expect(errorHandler).toHaveBeenCalledTimes(1);
				expect(errorHandler.mock.calls[0][0]).toBeInstanceOf(E.MoleculerError);
			});
		});
	});

	describe("Test with random order inside chunks", () => {
		let STORE = [];
		const payload = { ver: "4", sender: "remote", action: "posts.import", id: "123" };

		it("should create new stream", () => {
			const pass = transit._handleIncomingRequestStream(
				Object.assign({}, payload, { stream: true, seq: 0 })
			);
			expect(pass).toBeInstanceOf(Transform);
			pass.on("data", data => STORE.push(data.toString()));
			pass.on("error", () => STORE.push("-- ERROR --"));
			pass.on("end", () => STORE.push("-- END --"));
		});

		it("should reorder chunks", () => {
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: true, seq: 1, params: "CHUNK-1" })
				)
			).toBeNull();
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: true, seq: 4, params: "CHUNK-4" })
				)
			).toBeNull();
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: true, seq: 3, params: "CHUNK-3" })
				)
			).toBeNull();
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: true, seq: 2, params: "CHUNK-2" })
				)
			).toBeNull();
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: true, seq: 6, params: "CHUNK-6" })
				)
			).toBeNull();
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: true, seq: 5, params: "CHUNK-5" })
				)
			).toBeNull();
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: false, seq: 7 })
				)
			).toBeNull();

			return broker.Promise.delay(100).then(() => {
				expect(STORE).toEqual([
					"CHUNK-1",
					"CHUNK-2",
					"CHUNK-3",
					"CHUNK-4",
					"CHUNK-5",
					"CHUNK-6",
					"-- END --"
				]);
			});
		});
	});

	describe("Test with reverse order inside chunks", () => {
		let STORE = [];
		const payload = { ver: "4", sender: "remote", action: "posts.import", id: "123R" };

		it("should create new stream", () => {
			const pass = transit._handleIncomingRequestStream(
				Object.assign({}, payload, { stream: true, seq: 0 })
			);
			expect(pass).toBeInstanceOf(Transform);
			pass.on("data", data => STORE.push(data.toString()));
			pass.on("error", () => STORE.push("-- ERROR --"));
			pass.on("end", () => STORE.push("-- END --"));
		});

		it("should reorder chunks", () => {
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: false, seq: 7 })
				)
			).toBeNull();
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: true, seq: 6, params: "CHUNK-6" })
				)
			).toBeNull();
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: true, seq: 5, params: "CHUNK-5" })
				)
			).toBeNull();
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: true, seq: 4, params: "CHUNK-4" })
				)
			).toBeNull();
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: true, seq: 3, params: "CHUNK-3" })
				)
			).toBeNull();
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: true, seq: 2, params: "CHUNK-2" })
				)
			).toBeNull();
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: true, seq: 1, params: "CHUNK-1" })
				)
			).toBeNull();

			return broker.Promise.delay(100).then(() => {
				expect(STORE).toEqual([
					"CHUNK-1",
					"CHUNK-2",
					"CHUNK-3",
					"CHUNK-4",
					"CHUNK-5",
					"CHUNK-6",
					"-- END --"
				]);
			});
		});
	});

	describe("Test with wrong first & last chunks orders", () => {
		let STORE = [];
		const payload = { ver: "4", sender: "remote", action: "posts.import", id: "124" };

		it("should create new stream", () => {
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: true, seq: 1, params: "CHUNK-1" })
				)
			).toBeNull();
		});

		it("should reorder chunks", () => {
			const pass = transit._handleIncomingRequestStream(
				Object.assign({}, payload, { stream: true, seq: 0 })
			);
			expect(pass).toBeInstanceOf(Transform);
			pass.on("data", data => STORE.push(data.toString()));
			pass.on("error", () => STORE.push("-- ERROR --"));
			pass.on("end", () => STORE.push("-- END --"));

			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: true, seq: 4, params: "CHUNK-4" })
				)
			).toBeNull();
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: true, seq: 3, params: "CHUNK-3" })
				)
			).toBeNull();
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: true, seq: 2, params: "CHUNK-2" })
				)
			).toBeNull();
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: false, seq: 7 })
				)
			).toBeNull();
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: true, seq: 6, params: "CHUNK-6" })
				)
			).toBeNull();
			expect(
				transit._handleIncomingRequestStream(
					Object.assign({}, payload, { stream: true, seq: 5, params: "CHUNK-5" })
				)
			).toBeNull();

			return broker.Promise.delay(500).then(() => {
				expect(STORE).toEqual([
					"CHUNK-1",
					"CHUNK-2",
					"CHUNK-3",
					"CHUNK-4",
					"CHUNK-5",
					"CHUNK-6",
					"-- END --"
				]);
			});
		});
	});
});

describe("Test Transit._createErrFromPayload", () => {
	let broker;

	beforeEach(() => {
		broker = new ServiceBroker({
			logger: false,
			nodeID: "node1",
			transporter: new FakeTransporter()
		});
	});

	it("should call errorRegenerator.restore method", () => {
		const plainError = {
			name: "ServiceNotFoundError",
			code: 404,
			type: "SERVICE_NOT_FOUND",
			data: { a: 5 },
			retryable: true,
			nodeID: "node-1234",
			stack: "error stack"
		};
		const payload = {};
		broker.errorRegenerator.restore = jest.fn();

		broker.transit._createErrFromPayload(plainError, payload);

		expect(broker.errorRegenerator.restore).toHaveBeenCalled();
		expect(broker.errorRegenerator.restore).toHaveBeenCalledWith(plainError, payload);
	});
});

describe("Test Transit.responseHandler", () => {
	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node1",
		transporter: new FakeTransporter()
	});
	const transit = broker.transit;
	transit._handleIncomingResponseStream = jest.fn();

	let id = "12345";

	it("should not call resolve or reject if pending req is not exists", () => {
		let req = { resolve: jest.fn(), reject: jest.fn() };
		let payload = { ver: "4", sender: "remote", id };

		transit.responseHandler(payload);
		expect(req.resolve).toHaveBeenCalledTimes(0);
		expect(req.reject).toHaveBeenCalledTimes(0);

		expect(transit._handleIncomingResponseStream).toHaveBeenCalledTimes(0);
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

		let payload = {
			ver: "4",
			sender: "remote",
			id,
			success: true,
			data,
			headers: { contentType: "json" },
			stream: false
		};
		transit.responseHandler(payload);
		expect(req.resolve).toHaveBeenCalledTimes(1);
		expect(req.resolve).toHaveBeenCalledWith(data);
		expect(req.reject).toHaveBeenCalledTimes(0);
		expect(req.ctx.nodeID).toBe("remote");
		// expect(req.ctx.headers).toBe({ contentType: "json" });

		expect(transit.pendingRequests.size).toBe(0);
		expect(transit._handleIncomingResponseStream).toHaveBeenCalledTimes(1);
		expect(transit._handleIncomingResponseStream).toHaveBeenCalledWith(payload, req);
	});

	it("should call reject with error", () => {
		transit._handleIncomingResponseStream.mockClear();

		let err;
		let req = {
			action: { name: "posts.find" },
			ctx: { nodeID: null },
			resolve: jest.fn(),
			reject: jest.fn(e => (err = e))
		};
		transit.pendingRequests.set(id, req);

		let payload = {
			ver: "4",
			sender: "remote",
			id,
			success: false,
			error: {
				name: "ValidationError",
				code: 422,
				retryable: true,
				data: { a: 5 },
				stack: "STACK-TRACE"
			}
		};

		transit.responseHandler(payload);

		expect(transit._handleIncomingResponseStream).toHaveBeenCalledTimes(0);

		expect(req.reject).toHaveBeenCalledTimes(1);
		expect(req.reject).toHaveBeenCalledWith(err);
		expect(req.resolve).toHaveBeenCalledTimes(0);
		expect(req.ctx.nodeID).toBe("remote");

		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(E.ValidationError);
		expect(err.name).toBe("ValidationError");
		expect(err.code).toBe(422);
		expect(err.retryable).toBe(true);
		expect(err.data).toEqual({ a: 5 });
		expect(err.stack).toBe("STACK-TRACE");
		expect(err.nodeID).toBe("remote");

		expect(transit.pendingRequests.size).toBe(0);
	});

	it("should call reject with custom error", () => {
		transit._handleIncomingResponseStream.mockClear();

		let err;
		let req = {
			action: { name: "posts.find" },
			ctx: { nodeID: null },
			resolve: jest.fn(),
			reject: jest.fn(e => (err = e))
		};
		transit.pendingRequests.set(id, req);

		let payload = {
			ver: "4",
			sender: "remote",
			id,
			success: false,
			error: {
				name: "MyCustomError",
				code: 456,
				retryable: true,
				data: { a: 5 },
				stack: "MY-STACK-TRACE"
			}
		};

		transit.responseHandler(payload);

		expect(transit._handleIncomingResponseStream).toHaveBeenCalledTimes(0);

		expect(req.reject).toHaveBeenCalledTimes(1);
		expect(req.reject).toHaveBeenCalledWith(err);
		expect(req.resolve).toHaveBeenCalledTimes(0);
		expect(req.ctx.nodeID).toBe("remote");

		expect(err).toBeInstanceOf(Error);
		expect(err.name).toBe("MyCustomError");
		expect(err.code).toBe(456);
		expect(err.retryable).toBe(true);
		expect(err.data).toEqual({ a: 5 });
		expect(err.stack).toBe("MY-STACK-TRACE");
		expect(err.nodeID).toBe("remote");

		expect(transit.pendingRequests.size).toBe(0);
	});

	it("should not call resolve if stream chunk is received", () => {
		transit._handleIncomingResponseStream = jest.fn(() => true);

		let req = {
			action: { name: "posts.find" },
			ctx: { nodeID: null },
			resolve: jest.fn(() => Promise.resolve()),
			reject: jest.fn(() => Promise.resolve())
		};
		transit.pendingRequests.set(id, req);

		let payload = { ver: "4", sender: "remote", id, success: true, stream: true, seq: 5 };
		transit.responseHandler(payload);

		expect(transit._handleIncomingResponseStream).toHaveBeenCalledTimes(1);
		expect(transit._handleIncomingResponseStream).toHaveBeenCalledWith(payload, req);

		expect(req.resolve).toHaveBeenCalledTimes(0);
		expect(req.reject).toHaveBeenCalledTimes(0);
		expect(transit.pendingRequests.size).toBe(1);
	});
});

describe("Test Transit._handleIncomingResponseStream", () => {
	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node1",
		transporter: new FakeTransporter()
	});
	const transit = broker.transit;
	broker.started = true;

	describe("Test with non-stream data", () => {
		const payload = { ver: "4", sender: "remote", id: "123" };
		let req = {
			action: { name: "posts.find" },
			ctx: { nodeID: null },
			resolve: jest.fn(() => Promise.resolve()),
			reject: jest.fn(() => Promise.resolve())
		};
		transit.pendingRequests.set("123", req);

		it("should return false", () => {
			const pass = transit._handleIncomingResponseStream(
				Object.assign({}, payload, { stream: false, seq: 0 }),
				req
			);
			expect(pass).toBe(false);
		});

		it("should return false", () => {
			const pass = transit._handleIncomingResponseStream(
				Object.assign({}, payload, { stream: false }),
				req
			);
			expect(pass).toBe(false);
		});

		it("should return false", () => {
			const pass = transit._handleIncomingResponseStream(payload, req);
			expect(pass).toBe(false);
		});
	});

	describe("Test with sequential chunks", () => {
		let STORE = [];
		const payload = { ver: "4", sender: "remote", id: "124", success: true };
		let req = {
			action: { name: "posts.find" },
			ctx: { nodeID: null },
			resolve: jest.fn(() => Promise.resolve()),
			reject: jest.fn(() => Promise.resolve())
		};
		transit.pendingRequests.set("124", req);

		it("should create new stream", () => {
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 0 }),
					req
				)
			).toBe(true);
			expect(req.resolve).toHaveBeenCalledTimes(1);
			const pass = req.resolve.mock.calls[0][0];
			expect(pass).toBeInstanceOf(Transform);
			pass.on("data", data => STORE.push(data.toString()));
			pass.on("error", () => STORE.push("-- ERROR --"));
			pass.on("end", () => STORE.push("-- END --"));
		});

		it("should add chunks", () => {
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 1, data: "CHUNK-1" }),
					req
				)
			).toBe(true);
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 2, data: "CHUNK-2" }),
					req
				)
			).toBe(true);
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 3, data: "CHUNK-3" }),
					req
				)
			).toBe(true);
			expect(STORE).toEqual(["CHUNK-1", "CHUNK-2", "CHUNK-3"]);
		});

		it("should close the stream", () => {
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: false, seq: 4 }),
					req
				)
			).toBe(true);
			return broker.Promise.delay(100).then(() => {
				expect(STORE).toEqual(["CHUNK-1", "CHUNK-2", "CHUNK-3", "-- END --"]);
			});
		});
	});

	describe("Test with sequential chunks & error", () => {
		let STORE = [];
		const payload = { ver: "4", sender: "remote", id: "125", success: true };
		let req = {
			action: { name: "posts.find" },
			ctx: { nodeID: null },
			resolve: jest.fn(() => Promise.resolve()),
			reject: jest.fn(() => Promise.resolve())
		};
		const errorHandler = jest.fn(() => STORE.push("-- ERROR --"));
		transit.pendingRequests.set("125", req);

		it("should create new stream", () => {
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 0 }),
					req
				)
			).toBe(true);
			expect(req.resolve).toHaveBeenCalledTimes(1);
			const pass = req.resolve.mock.calls[0][0];
			expect(pass).toBeInstanceOf(Transform);
			pass.on("data", data => STORE.push(data.toString()));
			pass.on("error", errorHandler);
			pass.on("end", () => STORE.push("-- END --"));
		});

		it("should add chunks", () => {
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 1, data: "CHUNK-1" }),
					req
				)
			).toBe(true);
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 2, data: "CHUNK-2" }),
					req
				)
			).toBe(true);
			expect(STORE).toEqual(["CHUNK-1", "CHUNK-2"]);
		});

		it("should got error", () => {
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, {
						success: false,
						stream: false,
						seq: 3,
						error: { name: "MoleculerError", message: "Some stream error" }
					}),
					req
				)
			).toBe(true);
			return broker.Promise.delay(100).then(() => {
				expect(STORE).toEqual(["CHUNK-1", "CHUNK-2", "-- ERROR --", "-- END --"]);

				expect(errorHandler).toHaveBeenCalledTimes(1);
				expect(errorHandler.mock.calls[0][0]).toBeInstanceOf(E.MoleculerError);
			});
		});
	});

	describe("Test with random order inside chunks", () => {
		let STORE = [];
		const payload = { ver: "4", sender: "remote", id: "126", success: true };
		let req = {
			action: { name: "posts.find" },
			ctx: { nodeID: null },
			resolve: jest.fn(() => Promise.resolve()),
			reject: jest.fn(() => Promise.resolve())
		};
		transit.pendingRequests.set("126", req);
		const errorHandler = jest.fn(() => STORE.push("-- ERROR --"));

		it("should create new stream", () => {
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 0 }),
					req
				)
			).toBe(true);
			expect(req.resolve).toHaveBeenCalledTimes(1);
			const pass = req.resolve.mock.calls[0][0];
			expect(pass).toBeInstanceOf(Transform);
			pass.on("data", data => STORE.push(data.toString()));
			pass.on("error", errorHandler);
			pass.on("end", () => STORE.push("-- END --"));
		});

		it("should reorder chunks", () => {
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 1, data: "CHUNK-1" }),
					req
				)
			).toBe(true);
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 4, data: "CHUNK-4" }),
					req
				)
			).toBe(true);
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 3, data: "CHUNK-3" }),
					req
				)
			).toBe(true);
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 2, data: "CHUNK-2" }),
					req
				)
			).toBe(true);
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 6, data: "CHUNK-6" }),
					req
				)
			).toBe(true);
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 5, data: "CHUNK-5" }),
					req
				)
			).toBe(true);
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: false, seq: 7 }),
					req
				)
			).toBe(true);

			return broker.Promise.delay(100).then(() => {
				expect(STORE).toEqual([
					"CHUNK-1",
					"CHUNK-2",
					"CHUNK-3",
					"CHUNK-4",
					"CHUNK-5",
					"CHUNK-6",
					"-- END --"
				]);
			});
		});
	});

	describe("Test with reverse order inside chunks", () => {
		let STORE = [];
		const payload = { ver: "4", sender: "remote", id: "126R", success: true };
		let req = {
			action: { name: "posts.find" },
			ctx: { nodeID: null },
			resolve: jest.fn(() => Promise.resolve()),
			reject: jest.fn(() => Promise.resolve())
		};
		transit.pendingRequests.set("126R", req);
		const errorHandler = jest.fn(() => STORE.push("-- ERROR --"));

		it("should create new stream", () => {
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 0 }),
					req
				)
			).toBe(true);
			expect(req.resolve).toHaveBeenCalledTimes(1);
			const pass = req.resolve.mock.calls[0][0];
			expect(pass).toBeInstanceOf(Transform);
			pass.on("data", data => STORE.push(data.toString()));
			pass.on("error", errorHandler);
			pass.on("end", () => STORE.push("-- END --"));
		});

		it("should reorder chunks", () => {
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: false, seq: 7 }),
					req
				)
			).toBe(true);
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 6, data: "CHUNK-6" }),
					req
				)
			).toBe(true);
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 5, data: "CHUNK-5" }),
					req
				)
			).toBe(true);
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 4, data: "CHUNK-4" }),
					req
				)
			).toBe(true);
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 3, data: "CHUNK-3" }),
					req
				)
			).toBe(true);
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 2, data: "CHUNK-2" }),
					req
				)
			).toBe(true);
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 1, data: "CHUNK-1" }),
					req
				)
			).toBe(true);

			return broker.Promise.delay(100).then(() => {
				expect(STORE).toEqual([
					"CHUNK-1",
					"CHUNK-2",
					"CHUNK-3",
					"CHUNK-4",
					"CHUNK-5",
					"CHUNK-6",
					"-- END --"
				]);
			});
		});
	});

	describe("Test with wrong first & last chunks orders", () => {
		let STORE = [];
		const payload = { ver: "4", sender: "remote", id: "127", success: true };
		let req = {
			action: { name: "posts.find" },
			ctx: { nodeID: null },
			resolve: jest.fn(() => Promise.resolve()),
			reject: jest.fn(() => Promise.resolve())
		};
		transit.pendingRequests.set("127", req);
		const errorHandler = jest.fn(() => STORE.push("-- ERROR --"));

		it("should create new stream", () => {
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 1, data: "CHUNK-1" }),
					req
				)
			).toBe(true);
		});

		it("should reorder chunks", () => {
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 0 }),
					req
				)
			).toBe(true);
			expect(req.resolve).toHaveBeenCalledTimes(1);
			const pass = req.resolve.mock.calls[0][0];
			expect(pass).toBeInstanceOf(Transform);
			pass.on("data", data => STORE.push(data.toString()));
			pass.on("error", errorHandler);
			pass.on("end", () => STORE.push("-- END --"));

			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 4, data: "CHUNK-4" }),
					req
				)
			).toBe(true);
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 3, data: "CHUNK-3" }),
					req
				)
			).toBe(true);
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 2, data: "CHUNK-2" }),
					req
				)
			).toBe(true);
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: false, seq: 7 }),
					req
				)
			).toBe(true);
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 6, data: "CHUNK-6" }),
					req
				)
			).toBe(true);
			expect(
				transit._handleIncomingResponseStream(
					Object.assign({}, payload, { stream: true, seq: 5, data: "CHUNK-5" }),
					req
				)
			).toBe(true);

			return broker.Promise.delay(500).then(() => {
				expect(STORE).toEqual([
					"CHUNK-1",
					"CHUNK-2",
					"CHUNK-3",
					"CHUNK-4",
					"CHUNK-5",
					"CHUNK-6",
					"-- END --"
				]);
			});
		});
	});
});

describe("Test Transit.request", () => {
	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node1",
		transporter: new FakeTransporter()
	});
	const transit = broker.transit;
	transit._sendRequest = jest.fn((ctx, resolve, reject) => resolve());

	let ctx = new Context(broker, { action: { name: "users.find" } });
	ctx.nodeID = "remote";
	ctx.params = { a: 5 };
	ctx.meta = {
		user: {
			id: 5,
			roles: ["user"]
		}
	};
	ctx.headers = { auth: false };
	ctx.options.timeout = 500;
	ctx.id = "12345";
	ctx.requestID = "1111";

	it("should create packet", () => {
		return transit
			.request(ctx)
			.catch(protectReject)
			.then(() => {
				expect(transit._sendRequest).toHaveBeenCalledTimes(1);
				expect(transit._sendRequest).toHaveBeenCalledWith(
					ctx,
					expect.any(Function),
					expect.any(Function)
				);
			});
	});

	it("should throw error if queue is full", () => {
		transit.pendingRequests = { size: 100 };
		transit.opts.maxQueueSize = 100;
		return transit
			.request(ctx)
			.then(protectReject)
			.catch(err => {
				expect(err).toBeInstanceOf(E.QueueIsFullError);
				expect(err.data.action).toBe("users.find");
				expect(err.data.nodeID).toBe("node1");
				expect(err.data.size).toBe(100);
				expect(err.data.limit).toBe(100);
			});
	});
});

describe("Test Transit._sendRequest", () => {
	describe("without Stream", () => {
		const broker = new ServiceBroker({
			logger: false,
			nodeID: "node1",
			transporter: new FakeTransporter()
		});
		const transit = broker.transit;
		transit.publish = jest.fn(() => Promise.resolve());
		const id = "12345";

		const broadcastLocalMock = jest.fn();

		beforeEach(() => {
			broker.broadcastLocal = broadcastLocalMock;
			transit.publish = jest.fn(() => Promise.resolve());
		});

		afterEach(() => {
			broadcastLocalMock.mockClear();
		});

		let ctx = new Context(broker, { action: { name: "users.find" } });
		ctx.nodeID = "remote";
		ctx.params = { a: 5 };
		ctx.meta = {
			user: {
				id: 5,
				roles: ["user"]
			}
		};
		ctx.options.timeout = 500;
		ctx.headers = { auth: false };
		ctx.id = "12345";
		ctx.requestID = "1111";
		ctx.parentID = "0000";
		ctx.caller = "posts.list";
		ctx.tracing = true;
		ctx.level = 6;

		const resolve = jest.fn();
		const reject = jest.fn();

		it("should create packet", () => {
			return transit
				._sendRequest(ctx, resolve, reject)
				.catch(protectReject)
				.then(() => {
					expect(transit.publish).toHaveBeenCalledTimes(1);
					expect(transit.publish).toHaveBeenCalledWith({
						type: "REQ",
						target: "remote",
						payload: {
							action: "users.find",
							id: "12345",
							level: 6,
							meta: { user: { id: 5, roles: ["user"] } },
							headers: { auth: false },
							tracing: true,
							params: { a: 5 },
							parentID: "0000",
							requestID: "1111",
							caller: "posts.list",
							stream: false,
							timeout: 500
						}
					});

					expect(transit.pendingRequests.get(id)).toEqual({
						action: {
							name: "users.find"
						},
						nodeID: "remote",
						ctx,
						resolve,
						reject,
						stream: false
					});
				});
		});

		it("should broadcast an error", async () => {
			// Mock an error
			transit.publish = jest.fn(() =>
				Promise.reject(new Error("Error during failedSendRequestPacket!"))
			);

			await transit._sendRequest(ctx, resolve, reject);

			expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
			expect(broker.broadcastLocal).toHaveBeenCalledWith("$transit.error", {
				error: new Error("Error during failedSendRequestPacket!"),
				module: "transit",
				type: C.FAILED_SEND_REQUEST_PACKET
			});
		});
	});

	describe("with Stream", () => {
		const broker = new ServiceBroker({
			logger: false,
			nodeID: "node1",
			transporter: new FakeTransporter()
		});
		const transit = broker.transit;

		let ctx = new Context(broker, { action: { name: "users.find" } });
		ctx.nodeID = "remote";
		ctx.headers = { auth: false };
		ctx.id = "12345";
		ctx.requestID = "req-12345";

		const resolve = jest.fn();
		const reject = jest.fn();

		beforeEach(() => {
			transit.publish = jest.fn(() => Promise.resolve());
		});

		it("should send stream chunks", () => {
			transit.publish.mockClear();

			let stream = new Stream.Readable({
				read() {}
			});
			ctx.params = stream;

			return transit
				._sendRequest(ctx, resolve, reject)
				.catch(protectReject)
				.then(() => {
					expect(transit.publish).toHaveBeenCalledTimes(1);
					expect(transit.publish).toHaveBeenCalledWith({
						type: "REQ",
						target: "remote",
						payload: {
							action: "users.find",
							id: "12345",
							level: 1,
							meta: {},
							headers: { auth: false },
							tracing: null,
							params: null,
							parentID: null,
							requestID: "req-12345",
							caller: null,
							seq: 0,
							stream: true,
							timeout: null
						}
					});

					transit.publish.mockClear();
					stream.push("first chunk");
					stream.push("second chunk");
				})
				.delay(100)
				.then(() => {
					expect(transit.publish).toHaveBeenCalledTimes(2);
					expect(transit.publish).toHaveBeenCalledWith({
						type: "REQ",
						target: "remote",
						payload: {
							action: "users.find",
							id: "12345",
							level: 1,
							meta: {},
							headers: { auth: false },
							tracing: null,
							params: Buffer.from("first chunk"),
							parentID: null,
							requestID: "req-12345",
							caller: null,
							seq: 1,
							stream: true,
							timeout: null
						}
					});

					expect(transit.publish).toHaveBeenCalledWith({
						type: "REQ",
						target: "remote",
						payload: {
							action: "users.find",
							id: "12345",
							level: 1,
							meta: {},
							headers: { auth: false },
							tracing: null,
							params: Buffer.from("second chunk"),
							parentID: null,
							requestID: "req-12345",
							caller: null,
							seq: 2,
							stream: true,
							timeout: null
						}
					});

					transit.publish.mockClear();
					stream.emit("end");
				})
				.delay(100)
				.then(() => {
					expect(transit.publish).toHaveBeenCalledWith({
						type: "REQ",
						target: "remote",
						payload: {
							action: "users.find",
							id: "12345",
							level: 1,
							meta: {},
							headers: { auth: false },
							tracing: null,
							params: null,
							parentID: null,
							requestID: "req-12345",
							caller: null,
							seq: 3,
							stream: false,
							timeout: null
						}
					});
				});
		});

		it("should send splitted stream chunks", () => {
			transit.publish.mockClear();
			transit.opts.maxChunkSize = 100;
			let randomData = crypto.randomBytes(1024);
			let stream = new Stream.Readable({
				read() {}
			});
			ctx.params = stream;

			return transit
				._sendRequest(ctx, resolve, reject)
				.catch(protectReject)
				.then(() => {
					expect(transit.publish).toHaveBeenCalledTimes(1);
					expect(transit.publish).toHaveBeenCalledWith({
						type: "REQ",
						target: "remote",
						payload: {
							action: "users.find",
							id: "12345",
							level: 1,
							meta: {},
							headers: { auth: false },
							tracing: null,
							params: null,
							parentID: null,
							requestID: "req-12345",
							caller: null,
							seq: 0,
							stream: true,
							timeout: null
						}
					});

					transit.publish.mockClear();
					stream.push(randomData);
				})
				.delay(100)
				.then(() => {
					expect(transit.publish).toHaveBeenCalledTimes(
						Math.ceil(randomData.length / transit.opts.maxChunkSize)
					);

					for (
						let slice = 0;
						slice < Math.ceil(randomData.length / transit.opts.maxChunkSize);
						++slice
					) {
						expect(transit.publish).toHaveBeenCalledWith({
							type: "REQ",
							target: "remote",
							payload: {
								action: "users.find",
								id: "12345",
								level: 1,
								meta: {},
								headers: { auth: false },
								tracing: null,
								params: randomData.slice(
									slice * transit.opts.maxChunkSize,
									(slice + 1) * transit.opts.maxChunkSize
								),
								parentID: null,
								requestID: "req-12345",
								caller: null,
								seq: slice + 1,
								stream: true,
								timeout: null
							}
						});
					}

					transit.publish.mockClear();
					stream.emit("end");
				})
				.delay(100)
				.then(() => {
					expect(transit.publish).toHaveBeenCalledWith({
						type: "REQ",
						target: "remote",
						payload: {
							action: "users.find",
							id: "12345",
							level: 1,
							meta: {},
							headers: { auth: false },
							tracing: null,
							params: null,
							parentID: null,
							requestID: "req-12345",
							caller: null,
							seq: Math.ceil(randomData.length / transit.opts.maxChunkSize) + 1,
							stream: false,
							timeout: null
						}
					});
				});
		});

		it("should send splitted stream chunks from finished stream", () => {
			transit.publish = jest.fn(() => Promise.resolve());
			transit.opts.maxChunkSize = 100;
			let randomData = crypto.randomBytes(256); // length > maxChunkSize => will be splitted to several chunks
			let stream = new Stream.PassThrough();
			stream.end(randomData); // end stream before giving stream to transit => transit will receive "data" and "end" event immediately one after the other
			ctx.params = stream;

			return transit
				._sendRequest(ctx, resolve, reject)
				.catch(protectReject)
				.then(() => {
					expect(transit.publish).toHaveBeenCalledTimes(1);
					expect(transit.publish).toHaveBeenCalledWith({
						type: "REQ",
						target: "remote",
						payload: {
							action: "users.find",
							id: "12345",
							level: 1,
							meta: {},
							headers: { auth: false },
							tracing: null,
							params: null,
							parentID: null,
							requestID: "req-12345",
							caller: null,
							seq: 0,
							stream: true,
							timeout: null
						}
					});
					transit.publish.mockClear();
				})
				.delay(100)
				.then(() => {
					expect(transit.publish).toHaveBeenCalledTimes(
						Math.ceil(randomData.length / transit.opts.maxChunkSize) + 1
					);
					for (
						let slice = 0;
						slice < Math.ceil(randomData.length / transit.opts.maxChunkSize);
						++slice
					) {
						expect(transit.publish).toHaveBeenCalledWith({
							type: "REQ",
							target: "remote",
							payload: {
								action: "users.find",
								id: "12345",
								level: 1,
								meta: {},
								headers: { auth: false },
								tracing: null,
								params: randomData.slice(
									slice * transit.opts.maxChunkSize,
									(slice + 1) * transit.opts.maxChunkSize
								),
								parentID: null,
								requestID: "req-12345",
								caller: null,
								seq: slice + 1,
								stream: true,
								timeout: null
							}
						});
					}

					expect(transit.publish).toHaveBeenCalledWith({
						type: "REQ",
						target: "remote",
						payload: {
							action: "users.find",
							id: "12345",
							level: 1,
							meta: {},
							headers: { auth: false },
							tracing: null,
							params: null,
							parentID: null,
							requestID: "req-12345",
							caller: null,
							seq: Math.ceil(randomData.length / transit.opts.maxChunkSize) + 1,
							stream: false,
							timeout: null
						}
					});
				});
		});

		it("should send stream error", () => {
			transit.publish.mockClear();

			let stream = new Stream.Readable({
				read() {}
			});
			ctx.params = stream;

			return transit
				._sendRequest(ctx, resolve, reject)
				.catch(protectReject)
				.then(() => {
					expect(transit.publish).toHaveBeenCalledTimes(1);
					expect(transit.publish).toHaveBeenCalledWith({
						type: "REQ",
						target: "remote",
						payload: {
							action: "users.find",
							id: "12345",
							level: 1,
							meta: {},
							headers: { auth: false },
							tracing: null,
							params: null,
							parentID: null,
							requestID: "req-12345",
							caller: null,
							seq: 0,
							stream: true,
							timeout: null
						}
					});

					transit.publish.mockClear();
					stream.push("first chunk");
				})
				.delay(100)
				.then(() => {
					expect(transit.publish).toHaveBeenCalledTimes(1);
					expect(transit.publish).toHaveBeenCalledWith({
						type: "REQ",
						target: "remote",
						payload: {
							action: "users.find",
							id: "12345",
							level: 1,
							meta: {},
							headers: { auth: false },
							tracing: null,
							params: Buffer.from("first chunk"),
							parentID: null,
							requestID: "req-12345",
							caller: null,
							seq: 1,
							stream: true,
							timeout: null
						}
					});

					transit.publish.mockClear();
					transit._createPayloadErrorField = jest.fn(() => ({ error: true }));

					stream.emit("error", new Error("Something happened"));
				})
				.delay(100)
				.then(() => {
					expect(transit.publish).toHaveBeenCalledTimes(1);
					expect(transit.publish).toHaveBeenCalledWith({
						type: "REQ",
						target: "remote",
						payload: {
							action: "users.find",
							id: "12345",
							level: 1,
							meta: {
								$streamError: {
									error: true
								}
							},
							headers: { auth: false },
							tracing: null,
							params: null,
							parentID: null,
							requestID: "req-12345",
							caller: null,
							seq: 2,
							stream: false,
							timeout: null
						}
					});

					expect(transit._createPayloadErrorField).toHaveBeenCalledTimes(1);
				});
		});

		it("should send stream objects", () => {
			transit.publish.mockClear();

			let stream = new Stream.Readable({
				objectMode: true,
				read() {}
			});
			ctx.params = stream;

			return transit
				._sendRequest(ctx, resolve, reject)
				.catch(protectReject)
				.then(() => {
					expect(transit.publish).toHaveBeenCalledTimes(1);
					expect(transit.publish).toHaveBeenCalledWith({
						type: "REQ",
						target: "remote",
						payload: {
							action: "users.find",
							id: "12345",
							level: 1,
							meta: { $streamObjectMode: true },
							headers: { auth: false },
							tracing: null,
							params: null,
							parentID: null,
							requestID: "req-12345",
							caller: null,
							seq: 0,
							stream: true,
							timeout: null
						}
					});

					transit.publish.mockClear();
					stream.push({ id: 0 });
					stream.push({ id: 1 });
				})
				.delay(100)
				.then(() => {
					expect(transit.publish).toHaveBeenCalledTimes(2);
					expect(transit.publish).toHaveBeenCalledWith({
						type: "REQ",
						target: "remote",
						payload: {
							action: "users.find",
							id: "12345",
							level: 1,
							meta: { $streamObjectMode: true },
							headers: { auth: false },
							tracing: null,
							params: { id: 0 },
							parentID: null,
							requestID: "req-12345",
							caller: null,
							seq: 1,
							stream: true,
							timeout: null
						}
					});

					expect(transit.publish).toHaveBeenCalledWith({
						type: "REQ",
						target: "remote",
						payload: {
							action: "users.find",
							id: "12345",
							level: 1,
							meta: { $streamObjectMode: true },
							headers: { auth: false },
							tracing: null,
							params: { id: 1 },
							parentID: null,
							requestID: "req-12345",
							caller: null,
							seq: 2,
							stream: true,
							timeout: null
						}
					});

					transit.publish.mockClear();
					stream.emit("end");
				})
				.delay(100)
				.then(() => {
					expect(transit.publish).toHaveBeenCalledWith({
						type: "REQ",
						target: "remote",
						payload: {
							action: "users.find",
							id: "12345",
							level: 1,
							meta: { $streamObjectMode: true },
							headers: { auth: false },
							tracing: null,
							params: null,
							parentID: null,
							requestID: "req-12345",
							caller: null,
							seq: 3,
							stream: false,
							timeout: null
						}
					});
				});
		});
	});
});

describe("Test Transit.sendEvent", () => {
	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node1",
		transporter: new FakeTransporter()
	});
	const transit = broker.transit;

	transit.publish = jest.fn(() => Promise.resolve());

	const broadcastLocalMock = jest.fn();

	beforeEach(() => {
		broker.broadcastLocal = broadcastLocalMock;
	});

	afterEach(() => {
		broadcastLocalMock.mockClear();
	});

	const ep = {
		id: "node2",
		event: {
			name: "user.**"
		}
	};

	const ctx = Context.create(
		broker,
		ep,
		{ id: 5, name: "Jameson" },
		{
			meta: { a: 8 },
			headers: { auth: false },
			requestID: "request-id"
		}
	);
	ctx.id = "123456";
	ctx.eventName = "user.created";
	ctx.eventType = "broadcast";

	it("should call publish with groups & nodeID", () => {
		transit.publish.mockClear();
		ctx.eventGroups = ["users", "mail"];
		transit.sendEvent(ctx);
		expect(transit.publish).toHaveBeenCalledTimes(1);
		const packet = transit.publish.mock.calls[0][0];
		expect(packet).toBeInstanceOf(P.Packet);
		expect(packet).toEqual({
			target: "node2",
			type: "EVENT",
			payload: {
				id: "123456",
				event: "user.created",
				data: { id: 5, name: "Jameson" },
				groups: ["users", "mail"],
				broadcast: true,
				meta: { a: 8 },
				headers: { auth: false },
				level: 1,
				tracing: null,
				parentID: null,
				requestID: "request-id",
				caller: null,
				needAck: null
			}
		});
	});

	it("should call publish with groups & without nodeID", () => {
		transit.publish.mockClear();
		ctx.eventGroups = ["users", "mail"];
		ctx.endpoint = null;

		transit.sendEvent(ctx);
		expect(transit.publish).toHaveBeenCalledTimes(1);
		const packet = transit.publish.mock.calls[0][0];
		expect(packet).toBeInstanceOf(P.Packet);
		expect(packet).toEqual({
			target: null,
			type: "EVENT",
			payload: {
				id: "123456",
				event: "user.created",
				data: { id: 5, name: "Jameson" },
				groups: ["users", "mail"],
				broadcast: true,
				meta: { a: 8 },
				headers: { auth: false },
				level: 1,
				tracing: null,
				parentID: null,
				requestID: "request-id",
				caller: null,
				needAck: null
			}
		});
	});

	it("should broadcast an error", async () => {
		// Mock an error
		transit.publish = jest.fn(() =>
			Promise.reject(new Error("Error during failedSendEventPacket!"))
		);

		ctx.eventGroups = ["users", "mail"];

		expect.assertions(4);
		try {
			await transit.sendEvent(ctx);
		} catch (err) {
			expect(err).toBeInstanceOf(Error);
			expect(err.message).toEqual("Error during failedSendEventPacket!");
		}

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$transit.error", {
			error: new Error("Error during failedSendEventPacket!"),
			module: "transit",
			type: C.FAILED_SEND_EVENT_PACKET
		});
	});
});

describe("Test Transit.removePendingRequest", () => {
	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node1",
		transporter: new FakeTransporter()
	});
	const transit = broker.transit;

	const id = "12345";

	transit.pendingRequests.set(id, {});
	transit.pendingReqStreams.set(id, {});
	transit.pendingResStreams.set(id, {});

	it("should remove pending request from maps", () => {
		transit.removePendingRequest(id);

		expect(transit.pendingRequests.size).toBe(0);
		expect(transit.pendingReqStreams.size).toBe(0);
		expect(transit.pendingResStreams.size).toBe(0);
	});
});

describe("Test Transit.removePendingRequestByNodeID", () => {
	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node1",
		transporter: new FakeTransporter()
	});
	const transit = broker.transit;

	transit.publish = jest.fn(() => Promise.resolve());

	const resolve = jest.fn();
	const reject = jest.fn();
	const ep = { action: { name: "users.create" }, node: { id: "node1" } };
	const ctx = new Context(broker, ep);
	ctx.id = 1;
	ctx.nodeID = "node2";

	const resolve2 = jest.fn();
	const reject2 = jest.fn();
	const ctx2 = new Context(broker, ep);
	ctx.id = 2;
	ctx2.nodeID = "node3";

	it("should add to pendingRequest list", () => {
		expect(transit.pendingRequests.size).toBe(0);

		transit._sendRequest(ctx, resolve, reject);
		expect(transit.pendingRequests.size).toBe(1);

		transit._sendRequest(ctx2, resolve2, reject2);
		expect(transit.pendingRequests.size).toBe(2);
	});

	it("should not remove if call with other nodeID", () => {
		transit.removePendingRequestByNodeID("node1");
		expect(transit.pendingRequests.size).toBe(2);
	});

	it("should reject pending orders by nodeID", () => {
		transit.removePendingRequestByNodeID("node2");
		expect(transit.pendingRequests.size).toBe(1);
		expect(resolve).toHaveBeenCalledTimes(0);
		expect(resolve2).toHaveBeenCalledTimes(0);
		expect(reject).toHaveBeenCalledTimes(1);
		expect(reject).toHaveBeenCalledWith(expect.any(E.RequestRejectedError));
	});

	it("should reject pending orders by nodeID #2", () => {
		transit.removePendingRequestByNodeID("node3");
		expect(transit.pendingRequests.size).toBe(0);
		expect(resolve2).toHaveBeenCalledTimes(0);
		expect(reject2).toHaveBeenCalledTimes(1);
		expect(reject2).toHaveBeenCalledWith(expect.any(E.RequestRejectedError));
	});
});

describe("Test Transit._createPayloadErrorField", () => {
	let broker;

	beforeEach(() => {
		broker = new ServiceBroker({
			logger: false,
			nodeID: "node1",
			transporter: new FakeTransporter()
		});
	});

	it("should call errorRegenerator.extractPlainError method", () => {
		const payload = {};
		const err = new E.MoleculerRetryableError("Something went wrong", 456, "CUSTOM", { a: 5 });
		err.stack = "custom stack";
		broker.errorRegenerator.extractPlainError = jest.fn();

		broker.transit._createPayloadErrorField(err, payload);

		expect(broker.errorRegenerator.extractPlainError).toHaveBeenCalled();
		expect(broker.errorRegenerator.extractPlainError).toHaveBeenCalledWith(err, payload);
	});
});

describe("Test Transit.sendResponse", () => {
	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node1",
		transporter: new FakeTransporter()
	});
	const transit = broker.transit;

	transit.publish = jest.fn(() => Promise.resolve());
	const meta = { some: ["thing"] };
	const headers = { contentType: "json" };

	describe("without Stream", () => {
		const broadcastLocalMock = jest.fn();

		beforeEach(() => {
			broker.broadcastLocal = broadcastLocalMock;
		});

		afterEach(() => {
			broadcastLocalMock.mockClear();
			transit.publish = jest.fn(() => Promise.resolve());
		});

		it("should call publish with the data", () => {
			const data = { id: 1, name: "John Doe" };
			transit.sendResponse("node2", "12345", meta, headers, data);
			expect(transit.publish).toHaveBeenCalledTimes(1);
			const packet = transit.publish.mock.calls[0][0];
			expect(packet).toBeInstanceOf(P.Packet);
			expect(packet.type).toBe(P.PACKET_RESPONSE);
			expect(packet.target).toBe("node2");
			expect(packet.payload.id).toBe("12345");
			expect(packet.payload.meta).toBe(meta);
			expect(packet.payload.headers).toBe(headers);
			expect(packet.payload.success).toBe(true);
			expect(packet.payload.data).toBe(data);
		});

		it("should call publish with the error", () => {
			transit.publish.mockClear();
			transit.sendResponse(
				"node2",
				"12345",
				meta,
				headers,
				null,
				new E.ValidationError("Not valid params", "ERR_INVALID_A_PARAM", { a: "Too small" })
			);
			expect(transit.publish).toHaveBeenCalledTimes(1);
			const packet = transit.publish.mock.calls[0][0];
			expect(packet).toBeInstanceOf(P.Packet);
			expect(packet.type).toBe(P.PACKET_RESPONSE);
			expect(packet.target).toBe("node2");
			expect(packet.payload.id).toBe("12345");
			expect(packet.payload.meta).toBe(meta);
			expect(packet.payload.headers).toBe(headers);
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

		it("should broadcast an error", async () => {
			// Mock an error
			transit.publish = jest.fn(() =>
				Promise.reject(new Error("Error during failedSendResponsePacket!"))
			);

			const data = { id: 1, name: "John Doe" };
			await transit.sendResponse("node2", "12345", meta, headers, data);

			expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
			expect(broker.broadcastLocal).toHaveBeenCalledWith("$transit.error", {
				error: new Error("Error during failedSendResponsePacket!"),
				module: "transit",
				type: C.FAILED_SEND_RESPONSE_PACKET
			});
		});
	});

	describe("with Stream", () => {
		it("should send stream chunks", () => {
			transit.publish.mockClear();

			let stream = new Stream.Readable({
				read() {}
			});

			return transit
				.sendResponse("node2", "12345", meta, headers, stream)
				.then(() => {
					expect(transit.publish).toHaveBeenCalledTimes(1);
					expect(transit.publish).toHaveBeenLastCalledWith({
						payload: {
							data: null,
							id: "12345",
							meta,
							headers,
							seq: 0,
							stream: true,
							success: true
						},
						target: "node2",
						type: "RES"
					});

					transit.publish.mockClear();
					stream.push("first chunk");
					stream.push("second chunk");
				})
				.delay(100)
				.then(() => {
					expect(transit.publish).toHaveBeenCalledTimes(2);
					expect(transit.publish).toHaveBeenCalledWith({
						payload: {
							data: Buffer.from("first chunk"),
							id: "12345",
							meta,
							headers,
							seq: 1,
							stream: true,
							success: true
						},
						target: "node2",
						type: "RES"
					});

					expect(transit.publish).toHaveBeenCalledWith({
						payload: {
							data: Buffer.from("second chunk"),
							id: "12345",
							meta,
							headers,
							seq: 2,
							stream: true,
							success: true
						},
						target: "node2",
						type: "RES"
					});

					transit.publish.mockClear();
					stream.emit("end");
				})
				.delay(100)
				.then(() => {
					expect(transit.publish).toHaveBeenCalledWith({
						payload: {
							data: null,
							id: "12345",
							meta,
							headers,
							seq: 3,
							stream: false,
							success: true
						},
						target: "node2",
						type: "RES"
					});
				});
		});

		it("should send stream chunks", () => {
			transit.publish.mockClear();

			let stream = new Stream.Readable({
				read() {}
			});

			return transit
				.sendResponse("node2", "12345", meta, headers, stream)
				.then(() => {
					expect(transit.publish).toHaveBeenCalledTimes(1);
					expect(transit.publish).toHaveBeenLastCalledWith({
						payload: {
							data: null,
							id: "12345",
							meta,
							headers,
							seq: 0,
							stream: true,
							success: true
						},
						target: "node2",
						type: "RES"
					});

					transit.publish.mockClear();
					stream.push("first chunk");
				})
				.delay(100)
				.then(() => {
					expect(transit.publish).toHaveBeenCalledTimes(1);
					expect(transit.publish).toHaveBeenCalledWith({
						payload: {
							data: Buffer.from("first chunk"),
							id: "12345",
							meta,
							headers,
							seq: 1,
							stream: true,
							success: true
						},
						target: "node2",
						type: "RES"
					});

					transit.publish.mockClear();
					transit._createPayloadErrorField = jest.fn(() => ({ error: true }));

					stream.emit("error", new Error("Something happened"));
				})
				.delay(100)
				.then(() => {
					expect(transit.publish).toHaveBeenCalledTimes(1);
					expect(transit.publish).toHaveBeenCalledWith({
						payload: {
							data: null,
							error: {
								error: true
							},
							id: "12345",
							meta,
							headers,
							seq: 2,
							stream: false,
							success: false
						},
						target: "node2",
						type: "RES"
					});
				});
		});

		it("should send splitted stream chunks", () => {
			transit.publish.mockClear();
			transit.opts.maxChunkSize = 100;
			let randomData = crypto.randomBytes(1024);
			let stream = new Stream.Readable({
				read() {}
			});

			return transit
				.sendResponse("node2", "12345", meta, headers, stream)
				.then(() => {
					expect(transit.publish).toHaveBeenCalledTimes(1);
					expect(transit.publish).toHaveBeenLastCalledWith({
						payload: {
							data: null,
							id: "12345",
							meta,
							headers,
							seq: 0,
							stream: true,
							success: true
						},
						target: "node2",
						type: "RES"
					});

					transit.publish.mockClear();
					stream.push(randomData);
				})
				.delay(100)
				.then(() => {
					expect(transit.publish).toHaveBeenCalledTimes(
						Math.ceil(randomData.length / transit.opts.maxChunkSize)
					);

					for (
						let slice = 0;
						slice < Math.ceil(randomData.length / transit.opts.maxChunkSize);
						++slice
					) {
						expect(transit.publish).toHaveBeenCalledWith({
							payload: {
								data: randomData.slice(
									slice * transit.opts.maxChunkSize,
									(slice + 1) * transit.opts.maxChunkSize
								),
								id: "12345",
								meta,
								headers,
								seq: slice + 1,
								stream: true,
								success: true
							},
							target: "node2",
							type: "RES"
						});
					}

					transit.publish.mockClear();
					stream.emit("end");
				})
				.delay(100)
				.then(() => {
					expect(transit.publish).toHaveBeenCalledWith({
						payload: {
							data: null,
							id: "12345",
							meta,
							headers,
							seq: Math.ceil(randomData.length / transit.opts.maxChunkSize) + 1,
							stream: false,
							success: true
						},
						target: "node2",
						type: "RES"
					});
				});
		});
	});
});

describe("Test Transit.discoverNodes", () => {
	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node1",
		transporter: new FakeTransporter()
	});
	const transit = broker.transit;

	const broadcastLocalMock = jest.fn();

	beforeEach(() => {
		broker.broadcastLocal = broadcastLocalMock;
	});

	afterEach(() => {
		broadcastLocalMock.mockClear();
	});

	it("should call publish with correct params", () => {
		transit.publish = jest.fn(() => Promise.resolve());

		transit.discoverNodes();
		expect(transit.publish).toHaveBeenCalledTimes(1);
		const packet = transit.publish.mock.calls[0][0];
		expect(packet).toBeInstanceOf(P.Packet);
		expect(packet.type).toBe(P.PACKET_DISCOVER);
		expect(packet.payload).toEqual({});
	});

	it("should broadcast an error", async () => {
		// Mock an error
		transit.publish = jest.fn(() =>
			Promise.reject(new Error("Error during failedNodesDiscovery!"))
		);

		await transit.discoverNodes();
		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$transit.error", {
			error: new Error("Error during failedNodesDiscovery!"),
			module: "transit",
			type: C.FAILED_NODES_DISCOVERY
		});
	});
});

describe("Test Transit.discoverNode", () => {
	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node1",
		transporter: new FakeTransporter()
	});
	const transit = broker.transit;

	const broadcastLocalMock = jest.fn();

	beforeEach(() => {
		broker.broadcastLocal = broadcastLocalMock;
	});

	afterEach(() => {
		broadcastLocalMock.mockClear();
	});

	it("should call publish with correct params", () => {
		transit.publish = jest.fn(() => Promise.resolve());

		transit.discoverNode("node-2");
		expect(transit.publish).toHaveBeenCalledTimes(1);
		const packet = transit.publish.mock.calls[0][0];
		expect(packet).toBeInstanceOf(P.Packet);
		expect(packet.type).toBe(P.PACKET_DISCOVER);
		expect(packet.target).toBe("node-2");
		expect(packet.payload).toEqual({});
	});

	it("should broadcast an error", async () => {
		// Mock an error
		transit.publish = jest.fn(() =>
			Promise.reject(new Error("Error during failedNodeDiscovery!"))
		);

		await transit.discoverNode();
		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$transit.error", {
			error: new Error("Error during failedNodeDiscovery!"),
			module: "transit",
			type: C.FAILED_NODE_DISCOVERY
		});
	});
});

describe("Test Transit.sendNodeInfo", () => {
	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node1",
		transporter: new FakeTransporter(),
		internalServices: false
	});
	const transit = broker.transit;
	const localNodeInfo = {
		id: "node2",
		services: [],
		instanceID: "123456",
		metadata: {
			region: "eu-west1"
		}
	};

	transit.tx.makeBalancedSubscriptions = jest.fn(() => Promise.resolve());
	transit.publish = jest.fn(() => Promise.resolve());

	const broadcastLocalMock = jest.fn();

	beforeEach(() => {
		broker.broadcastLocal = broadcastLocalMock;
	});

	afterEach(() => {
		broadcastLocalMock.mockClear();
		transit.publish = jest.fn(() => Promise.resolve());
	});

	it("should not call publish while not connected", () => {
		return transit.sendNodeInfo(localNodeInfo, "node2").then(() => {
			expect(transit.publish).toHaveBeenCalledTimes(0);
		});
	});

	it("should not call publish while not ready", () => {
		transit.connected = true;
		return transit.sendNodeInfo(localNodeInfo, "node2").then(() => {
			expect(transit.publish).toHaveBeenCalledTimes(0);
		});
	});

	it("should call publish with correct params if has nodeID", () => {
		transit.isReady = true;
		return transit.sendNodeInfo(localNodeInfo, "node2").then(() => {
			expect(transit.tx.makeBalancedSubscriptions).toHaveBeenCalledTimes(0);
			expect(transit.publish).toHaveBeenCalledTimes(1);
			const packet = transit.publish.mock.calls[0][0];
			expect(packet).toBeInstanceOf(P.Packet);
			expect(packet.type).toBe(P.PACKET_INFO);
			expect(packet.target).toBe("node2");
			expect(packet.payload.services).toEqual([]);
		});
	});

	it("should call publish with correct params if has no nodeID & disableBalancer: false", () => {
		// Set disableBalancer option
		broker.options.disableBalancer = false;
		transit.publish.mockClear();
		transit.tx.makeBalancedSubscriptions.mockClear();

		return transit.sendNodeInfo(localNodeInfo).then(() => {
			expect(transit.tx.makeBalancedSubscriptions).toHaveBeenCalledTimes(0);
			expect(transit.publish).toHaveBeenCalledTimes(1);
			const packet = transit.publish.mock.calls[0][0];
			expect(packet).toBeInstanceOf(P.Packet);
			expect(packet.type).toBe(P.PACKET_INFO);
			expect(packet.target).toBe();
			expect(packet.payload).toEqual({
				client: undefined,
				config: undefined,
				hostname: undefined,
				instanceID: broker.instanceID,
				ipList: undefined,
				metadata: { region: "eu-west1" },
				seq: undefined,
				services: []
			});
		});
	});

	it("should broadcast an error", async () => {
		// Mock an error
		transit.publish = jest.fn(() =>
			Promise.reject(new Error("Error during failedSendInfoPacket!"))
		);

		await transit.sendNodeInfo(localNodeInfo, "node2");
		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$transit.error", {
			error: new Error("Error during failedSendInfoPacket!"),
			module: "transit",
			type: C.FAILED_SEND_INFO_PACKET
		});
	});
});

describe("Test Transit.sendPing", () => {
	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node-1",
		transporter: new FakeTransporter()
	});
	const transit = broker.transit;

	transit.publish = jest.fn(() => Promise.resolve());

	const broadcastLocalMock = jest.fn();

	beforeEach(() => {
		broker.broadcastLocal = broadcastLocalMock;
	});

	afterEach(() => {
		broadcastLocalMock.mockClear();
		transit.publish = jest.fn(() => Promise.resolve());
	});

	it("should call publish with correct params", () => {
		transit.sendPing("node-2");
		expect(transit.publish).toHaveBeenCalledTimes(1);
		const packet = transit.publish.mock.calls[0][0];
		expect(packet).toBeInstanceOf(P.Packet);
		expect(packet.type).toBe(P.PACKET_PING);
		expect(packet.target).toBe("node-2");
		expect(packet.payload).toEqual({ time: expect.any(Number), id: expect.any(String) });
	});

	it("should broadcast an error", async () => {
		// Mock an error
		transit.publish = jest.fn(() =>
			Promise.reject(new Error("Error during failedSendPingPacket!"))
		);

		await transit.sendPing("node-2");
		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$transit.error", {
			error: new Error("Error during failedSendPingPacket!"),
			module: "transit",
			type: C.FAILED_SEND_PING_PACKET
		});
	});
});

describe("Test Transit.sendPong", () => {
	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node-1",
		transporter: new FakeTransporter()
	});
	const transit = broker.transit;

	transit.publish = jest.fn(() => Promise.resolve());

	const broadcastLocalMock = jest.fn();

	beforeEach(() => {
		broker.broadcastLocal = broadcastLocalMock;
	});

	afterEach(() => {
		broadcastLocalMock.mockClear();
		transit.publish = jest.fn(() => Promise.resolve());
	});

	it("should call publish with correct params", () => {
		transit.sendPong({ sender: "node-2", time: 123456 });
		expect(transit.publish).toHaveBeenCalledTimes(1);
		const packet = transit.publish.mock.calls[0][0];
		expect(packet).toBeInstanceOf(P.Packet);
		expect(packet.type).toBe(P.PACKET_PONG);
		expect(packet.target).toBe("node-2");
		expect(packet.payload).toEqual({ time: 123456, arrived: expect.any(Number) });
	});

	it("should broadcast an error", async () => {
		// Mock an error
		transit.publish = jest.fn(() =>
			Promise.reject(new Error("Error during failedSendPongPacket!"))
		);

		await transit.sendPong({ sender: "node-2", time: 123456 });
		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$transit.error", {
			error: new Error("Error during failedSendPongPacket!"),
			module: "transit",
			type: C.FAILED_SEND_PONG_PACKET
		});
	});
});

describe("Test Transit.processPong", () => {
	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node-1",
		transporter: new FakeTransporter()
	});
	const transit = broker.transit;

	broker.broadcastLocal = jest.fn();

	it("should call broadcastLocal with ping result", () => {
		let now = Date.now();
		transit.processPong({ sender: "node-2", arrived: now, time: now - 500 });

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$node.pong", {
			elapsedTime: expect.any(Number),
			nodeID: "node-2",
			timeDiff: expect.any(Number)
		});
	});
});

describe("Test Transit.sendHeartbeat", () => {
	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node1",
		transporter: new FakeTransporter()
	});
	const transit = broker.transit;

	transit.publish = jest.fn(() => Promise.resolve());

	const broadcastLocalMock = jest.fn();

	beforeEach(() => {
		broker.broadcastLocal = broadcastLocalMock;
	});

	afterEach(() => {
		broadcastLocalMock.mockClear();
		transit.publish = jest.fn(() => Promise.resolve());
	});

	it("should call publish with correct params", () => {
		transit.sendHeartbeat({ cpu: 12 });
		expect(transit.publish).toHaveBeenCalledTimes(1);
		const packet = transit.publish.mock.calls[0][0];
		expect(packet).toBeInstanceOf(P.Packet);
		expect(packet.type).toBe(P.PACKET_HEARTBEAT);
		expect(packet.payload.cpu).toBe(12);
	});

	it("should broadcast an error", async () => {
		// Mock an error
		transit.publish = jest.fn(() =>
			Promise.reject(new Error("Error during failedSendHeartbeatPacket!"))
		);

		await transit.sendHeartbeat({ cpu: 12 });
		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$transit.error", {
			error: new Error("Error during failedSendHeartbeatPacket!"),
			module: "transit",
			type: C.FAILED_SEND_HEARTBEAT_PACKET
		});
	});
});

describe("Test Transit.publish", () => {
	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node1",
		transporter: new FakeTransporter()
	});
	const transit = broker.transit;
	const transporter = transit.tx;

	transporter.prepublish = jest.fn();
	broker.serializer.serialize = jest.fn(o => JSON.stringify(o));

	it("should call transporter.prepublish", () => {
		let packet = new P.Packet(P.PACKET_EVENT);
		transit.publish(packet);
		expect(transporter.prepublish).toHaveBeenCalledTimes(1);
		const p = transporter.prepublish.mock.calls[0][0];
		expect(p).toBe(packet);
	});

	it("should call transporter.prepublish after subscribing", () => {
		transporter.prepublish.mockClear();
		let resolve;
		transit.subscribing = new Promise(r => (resolve = r));

		let packet = new P.Packet(P.PACKET_EVENT);
		let p = transit.publish(packet);

		expect(transporter.prepublish).toHaveBeenCalledTimes(0);
		resolve();

		return p.catch(protectReject).then(() => {
			expect(transporter.prepublish).toHaveBeenCalledTimes(1);
			const p = transporter.prepublish.mock.calls[0][0];
			expect(p).toBe(packet);
		});
	});
});
