const ServiceBroker = require("../../src/service-broker");
const Context = require("../../src/context");
const Transit = require("../../src/transit");
const FakeTransporter = require("../../src/transporters/fake");
const { RequestTimeoutError, ValidationError } = require("../../src/errors");
const P = require("../../src/packets");

describe("Test Transporter constructor", () => {

	const broker = new ServiceBroker();
	const transporter = new FakeTransporter();

	it("create instance", () => {
		let transit = new Transit(broker, transporter);
		expect(transit).toBeDefined();
		expect(transit.opts).toBeUndefined();
		expect(transit.connect).toBeDefined();
		expect(transit.disconnect).toBeDefined();
		expect(transit.emit).toBeDefined();
		expect(transit.request).toBeDefined();
		expect(transit.logger).toBeDefined();
		expect(transit.nodeID).toBe(broker.nodeID);
		expect(transit.tx).toBe(transporter);
		expect(transit.pendingRequests).toBeInstanceOf(Map);
	});
 
	it("create instance with options", () => {
		let opts = { id: 5 };
		let transit = new Transit(broker, transporter, opts);
		expect(transit).toBeDefined();
		expect(transit.opts).toBe(opts);
	});

	it("should call transporter.init", () => {
		transporter.init = jest.fn();
		new Transit(broker, transporter);

		expect(transporter.init).toHaveBeenCalledTimes(1);
		expect(transporter.init).toHaveBeenCalledWith(broker, jasmine.any(Function));
	});
});

describe("Test Transit.connect", () => {

	const broker = new ServiceBroker();
	const transporter = new FakeTransporter();
	const transit = new Transit(broker, transporter);

	transporter.connect = jest.fn(() => Promise.resolve());
	transit.makeSubscriptions = jest.fn(() => Promise.resolve());
	transit.discoverNodes = jest.fn(() => Promise.resolve());

	it("should call transporter connect & makeSubscriptions & discoverNodes", () => {
		return transit.connect().then(() => {
			expect(transporter.connect).toHaveBeenCalledTimes(1);
			expect(transit.makeSubscriptions).toHaveBeenCalledTimes(1);
			expect(transit.discoverNodes).toHaveBeenCalledTimes(1);
		});
	});

});

describe("Test Transit.disconnect", () => {

	const broker = new ServiceBroker();
	const transporter = new FakeTransporter();
	const transit = new Transit(broker, transporter);

	transporter.disconnect = jest.fn(() => Promise.resolve());
	transit.sendDisconnectPacket = jest.fn(() => Promise.resolve());

	transit.connect();
	
	it("should call transporter disconnect & sendDisconnectPacket", () => {
		return transit.disconnect().then(() => {
			expect(transporter.disconnect).toHaveBeenCalledTimes(1);
			expect(transit.sendDisconnectPacket).toHaveBeenCalledTimes(1);
		});
	});

});

describe("Test Transit.sendDisconnectPacket", () => {

	const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
	const transit = broker.transit;

	transit.publish = jest.fn();

	it("should call publish iwth correct params", () => {
		return transit.sendDisconnectPacket().then(() => {
			expect(transit.publish).toHaveBeenCalledTimes(1);
			expect(transit.publish).toHaveBeenCalledWith(jasmine.any(P.PacketDisconnect));
		});
	});

});

describe("Test Transit.makeSubscriptions", () => {

	const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
	const transit = broker.transit;

	transit.subscribe = jest.fn();

	it("should call subscribe with all topics", () => {
		transit.makeSubscriptions();
		expect(transit.subscribe).toHaveBeenCalledTimes(7);
		expect(transit.subscribe).toHaveBeenCalledWith("EVENT");
		expect(transit.subscribe).toHaveBeenCalledWith("REQ", "node1");
		expect(transit.subscribe).toHaveBeenCalledWith("RES", "node1");
		expect(transit.subscribe).toHaveBeenCalledWith("DISCOVER");
		expect(transit.subscribe).toHaveBeenCalledWith("INFO", "node1");
		expect(transit.subscribe).toHaveBeenCalledWith("DISCONNECT");
		expect(transit.subscribe).toHaveBeenCalledWith("HEARTBEAT");
	});

});

describe("Test Transit.emit", () => {

	const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
	const transit = broker.transit;

	transit.publish = jest.fn();

	it("should call publish with correct params", () => {
		const user = { id: 5, name: "Jameson" };
		transit.emit("user.created", user);
		expect(transit.publish).toHaveBeenCalledTimes(1);
		const packet = transit.publish.mock.calls[0][0];
		expect(packet).toBeInstanceOf(P.PacketEvent);
		expect(packet.payload.event).toBe("user.created");
		expect(packet.payload.data).toBe("{\"id\":5,\"name\":\"Jameson\"}");
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
		//transit.deserialize = jest.fn(() => null);
		expect(() => {
			transit.messageHandler("EVENT");
		}).toThrow("Missing packet!");

		//transit.deserialize.mockReset();
	});

	it("should call broker.emitLocal if topic is 'EVENT' ", () => {
		broker.emitLocal = jest.fn();

		let msg = { sender: "remote", event: "user.created", data: JSON.stringify("John Doe") };
		transit.messageHandler("EVENT", JSON.stringify(msg));

		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith(msg.event, "John Doe");
	});

	describe("Test 'REQ'", () => {
		let broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
		let transit = broker.transit;
		transit.sendResponse = jest.fn();

		it("should call broker.call & sendResponse with result", () => {
			let response = [1, 5, 8];
			broker.call = jest.fn(() => Promise.resolve(response));

			let msg = { sender: "remote", action: "posts.find", id: "123", params: JSON.stringify({ limit: 5 }) };
			return transit.messageHandler("REQ", JSON.stringify(msg)).then(() => {
				expect(broker.call).toHaveBeenCalledTimes(1);
				expect(broker.call).toHaveBeenCalledWith(msg.action, { limit: 5 }, {});

				expect(transit.sendResponse).toHaveBeenCalledTimes(1);
				expect(transit.sendResponse).toHaveBeenCalledWith("remote", "123", [1, 5, 8], null);

			});

		});

		it("should call broker.call & sendResponse with error", () => {
			transit.sendResponse.mockClear();
			broker.call = jest.fn(() => Promise.reject(new ValidationError("Not valid params")));

			let msg = { sender: "remote", action: "posts.create", id: "123", params: JSON.stringify({ title: "Hello" }) };
			return transit.messageHandler("REQ", JSON.stringify(msg)).then(() => {
				expect(broker.call).toHaveBeenCalledTimes(1);
				expect(broker.call).toHaveBeenCalledWith(msg.action, { title: "Hello" }, {});

				expect(transit.sendResponse).toHaveBeenCalledTimes(1);
				expect(transit.sendResponse).toHaveBeenCalledWith("remote", "123", null, jasmine.any(ValidationError));
			});

		});

	});

	describe("Test 'RES'", () => {
		const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
		const transit = broker.transit;

		let id = "12345";

		it("should not call resolve or reject if prending req is not exists", () => {
			let req = { resolve: jest.fn(), reject: jest.fn() };
			let msg = { sender: "remote", id };
			
			return transit.messageHandler("RES", JSON.stringify(msg)).then(() => {
				expect(req.resolve).toHaveBeenCalledTimes(0);
				expect(req.reject).toHaveBeenCalledTimes(0);
			});

		});
		
		it("should call resolve with data", () => {
			let data = { id: 5, name: "John" };
			let req = { 
				resolve: jest.fn(() => Promise.resolve()), 
				reject: jest.fn(() => Promise.resolve()) 
			};
			transit.pendingRequests.set(id, req);

			let msg = { sender: "remote", id, success: true, data: JSON.stringify(data) };			
			return transit.messageHandler("RES", JSON.stringify(msg)).then(() => {
				expect(req.resolve).toHaveBeenCalledTimes(1);
				expect(req.resolve).toHaveBeenCalledWith(data);
				expect(req.reject).toHaveBeenCalledTimes(0);

				expect(transit.pendingRequests.size).toBe(0);
			});

		});
		
		it("should call reject with error", () => {
			let req = { 
				resolve: jest.fn(), 
				reject: jest.fn(err => Promise.reject(err)) 
			};
			transit.pendingRequests.set(id, req);

			let msg = { sender: "remote", id, success: false, error: {
				name: "ValidationError",
				code: 422,
				data: JSON.stringify({ a: 5 })
			}};	

			return transit.messageHandler("RES", JSON.stringify(msg)).catch(err => {
				expect(req.reject).toHaveBeenCalledTimes(1);
				expect(req.reject).toHaveBeenCalledWith(err);
				expect(req.resolve).toHaveBeenCalledTimes(0);

				expect(err.name).toBe("ValidationError");
				expect(err.code).toBe(422);
				expect(err.data).toEqual({ a: 5 });
				expect(err.nodeID).toBe("remote");

				expect(transit.pendingRequests.size).toBe(0);
			});

		});

	});

	it("should call broker.processNodeInfo if topic is 'INFO' ", () => {
		broker.processNodeInfo = jest.fn();

		let msg = { sender: "remote", actions: JSON.stringify({}) };
		transit.messageHandler("INFO", JSON.stringify(msg));

		expect(broker.processNodeInfo).toHaveBeenCalledTimes(1);
		expect(broker.processNodeInfo).toHaveBeenCalledWith("remote", {"actions": {}, "sender": "remote"});
	});	

	it("should call broker.processNodeInfo & sendNodeInfo if topic is 'DISCOVER' ", () => {
		broker.processNodeInfo = jest.fn();
		transit.sendNodeInfo = jest.fn();

		let msg = { sender: "remote", actions: JSON.stringify({}) };
		transit.messageHandler("DISCOVER", JSON.stringify(msg));

		expect(broker.processNodeInfo).toHaveBeenCalledTimes(1);
		expect(broker.processNodeInfo).toHaveBeenCalledWith("remote", {"actions": {}, "sender": "remote"});

		expect(transit.sendNodeInfo).toHaveBeenCalledTimes(1);
	});	

	it("should call broker.nodeDisconnected if topic is 'DISCONNECT' ", () => {
		broker.nodeDisconnected = jest.fn();

		let msg = { sender: "remote" };
		transit.messageHandler("DISCONNECT", JSON.stringify(msg));

		expect(broker.nodeDisconnected).toHaveBeenCalledTimes(1);
		expect(broker.nodeDisconnected).toHaveBeenCalledWith(msg.sender, msg);
	});	

	it("should call broker.nodeHeartbeat if topic is 'HEARTBEAT' ", () => {
		broker.nodeHeartbeat = jest.fn();

		let msg = { sender: "remote" };
		transit.messageHandler("HEARTBEAT", JSON.stringify(msg));

		expect(broker.nodeHeartbeat).toHaveBeenCalledTimes(1);
		expect(broker.nodeHeartbeat).toHaveBeenCalledWith(msg.sender, msg);
	});	

});

describe("Test Transit.request", () => {

	const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
	const transit = broker.transit;

	it("should create packet", () => {
		let ctx = new Context({
			nodeID: "remote",
			action: { name: "users.find" },
			params: { a: 5 }
		});
		ctx.id = "12345";

		transit.publish = jest.fn(() => {
			let req = transit.pendingRequests.get("12345");
			return req.resolve(req);
		});

		return transit.request(ctx).then(req => {
			expect(transit.pendingRequests.size).toBe(1);
			expect(transit.publish).toHaveBeenCalledTimes(1);
			const packet = transit.publish.mock.calls[0][0];
			expect(packet).toBeInstanceOf(P.PacketRequest);
			expect(packet.payload.id).toBe("12345");
			expect(packet.payload.action).toBe("users.find");
			expect(packet.payload.params).toBe("{\"a\":5}");

			expect(req.nodeID).toBe("remote");
			//expect(req.ctx).toBe(ctx);
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
		expect(packet.payload.data).toBe("{\"id\":1,\"name\":\"John Doe\"}");
	});

	it("should call publish with the error", () => {
		transit.publish.mockClear();
		transit.sendResponse("node2", "12345", null, new ValidationError("Not valid params", { a: "Too small" }));
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
		expect(packet.payload.error.nodeID).toBe("node1");
		expect(packet.payload.error.data).toBe("{\"a\":\"Too small\"}");
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
		expect(packet.payload.actions).toBe("{}");
	});

});

describe("Test Transit.sendNodeInfo", () => {

	const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
	const transit = broker.transit;

	transit.publish = jest.fn();

	it("should call publish with correct params", () => {
		transit.sendNodeInfo("node2");
		expect(transit.publish).toHaveBeenCalledTimes(1);
		const packet = transit.publish.mock.calls[0][0];
		expect(packet).toBeInstanceOf(P.PacketInfo);
		expect(packet.target).toBe("node2");
		expect(packet.payload.actions).toBe("{}");
	});

});

describe("Test Transit.sendHeartbeat", () => {

	const broker = new ServiceBroker({ nodeID: "node1", transporter: new FakeTransporter() });
	const transit = broker.transit;

	transit.publish = jest.fn();

	it("should call publish with correct params", () => {
		transit.sendHeartbeat();
		expect(transit.publish).toHaveBeenCalledTimes(1);
		const packet = transit.publish.mock.calls[0][0];
		expect(packet).toBeInstanceOf(P.PacketHeartbeat);
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

	transporter.publish = jest.fn();
	broker.serializer.serialize = jest.fn(o => JSON.stringify(o));

	it("should call transporter.publish", () => {
		let packet = new P.PacketEvent("user.created", { a: "John Doe" });
		transit.publish(packet);
		expect(transporter.publish).toHaveBeenCalledTimes(1);
		const p = transporter.publish.mock.calls[0][0];
		expect(p).toBe(packet);
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

	it("should call broker.serializer.deserialize", () => {
		let payload = { a: "John Doe" };
		transit.deserialize(payload, P.PACKET_DISCOVER);
		expect(broker.serializer.deserialize).toHaveBeenCalledTimes(1);
		expect(broker.serializer.deserialize).toHaveBeenCalledWith(payload, P.PACKET_DISCOVER);
	});

});