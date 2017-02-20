const ServiceBroker = require("../src/service-broker");
const Transit = require("../src/transit");
const FakeTransporter = require("../src/transporters/fake");
const { RequestTimeoutError, ValidationError } = require("../src/errors");

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

	it("should call transporter disconnect & sendDisconnectPacket", () => {
		return transit.disconnect().then(() => {
			expect(transporter.disconnect).toHaveBeenCalledTimes(1);
			expect(transit.sendDisconnectPacket).toHaveBeenCalledTimes(1);
		});
	});

});

describe("Test Transit.sendDisconnectPacket", () => {

	const broker = new ServiceBroker();
	const transporter = new FakeTransporter();
	const transit = new Transit(broker, transporter);

	transit.publish = jest.fn();

	it("should call publish iwth correct params", () => {
		return transit.sendDisconnectPacket().then(() => {
			expect(transit.publish).toHaveBeenCalledTimes(1);
			expect(transit.publish).toHaveBeenCalledWith(["DISCONNECT"], "{\"nodeID\":\"bobcsi-pc\"}");
		});
	});

});

describe("Test Transit.makeSubscriptions", () => {

	const broker = new ServiceBroker({ nodeID: "node1" });
	const transporter = new FakeTransporter();
	const transit = new Transit(broker, transporter);

	transit.subscribe = jest.fn();

	it("should call subscribe with all topics", () => {
		transit.makeSubscriptions();
		expect(transit.subscribe).toHaveBeenCalledTimes(7);
		expect(transit.subscribe).toHaveBeenCalledWith(["EVENT"]);
		expect(transit.subscribe).toHaveBeenCalledWith(["REQ", "node1"]);
		expect(transit.subscribe).toHaveBeenCalledWith(["RES", "node1"]);
		expect(transit.subscribe).toHaveBeenCalledWith(["DISCOVER"]);
		expect(transit.subscribe).toHaveBeenCalledWith(["INFO", "node1"]);
		expect(transit.subscribe).toHaveBeenCalledWith(["DISCONNECT"]);
		expect(transit.subscribe).toHaveBeenCalledWith(["HEARTBEAT"]);
	});

});

describe("Test Transit.emit", () => {

	const broker = new ServiceBroker({ nodeID: "node1" });
	const transporter = new FakeTransporter();
	const transit = new Transit(broker, transporter);

	transit.publish = jest.fn();

	it("should call publish with correct params", () => {
		const user = { id: 5, name: "Jameson" };
		transit.emit("user.created", user);
		expect(transit.publish).toHaveBeenCalledTimes(1);
		expect(transit.publish).toHaveBeenCalledWith(["EVENT"], "{\"nodeID\":\"node1\",\"event\":\"user.created\",\"param\":{\"id\":5,\"name\":\"Jameson\"}}");
	});

});

describe("Test Transit.messageHandler", () => {

	const broker = new ServiceBroker({ nodeID: "node1" });
	const transporter = new FakeTransporter();
	const transit = new Transit(broker, transporter);

	// transit.subscribe = jest.fn();

	it("should call subscribe with all topics", () => {
	});

});

describe("Test Transit.request", () => {

	const broker = new ServiceBroker({ nodeID: "node1" });
	const transporter = new FakeTransporter();
	const transit = new Transit(broker, transporter);

	// transit.subscribe = jest.fn();

	it("should call subscribe with all topics", () => {
	});

});

describe("Test Transit.sendResponse", () => {

	const broker = new ServiceBroker({ nodeID: "node1" });
	const transporter = new FakeTransporter();
	const transit = new Transit(broker, transporter);

	transit.publish = jest.fn();

	it("should call publish with the data", () => {
		const data = { id: 1, name: "John Doe" };
		transit.sendResponse("node2", "12345", data);
		expect(transit.publish).toHaveBeenCalledTimes(1);
		expect(transit.publish).toHaveBeenCalledWith(["RES", "node2"],  "{\"success\":true,\"nodeID\":\"node1\",\"requestID\":\"12345\",\"data\":{\"id\":1,\"name\":\"John Doe\"}}");
	});

	it("should call publish with the error", () => {
		transit.publish.mockClear();
		transit.sendResponse("node2", "12345", null, new ValidationError("Not valid params", { a: "Too small" }));
		expect(transit.publish).toHaveBeenCalledTimes(1);
		expect(transit.publish).toHaveBeenCalledWith(["RES", "node2"],   "{\"success\":false,\"nodeID\":\"node1\",\"requestID\":\"12345\",\"data\":null,\"error\":{\"name\":\"ValidationError\",\"message\":\"Not valid params\",\"code\":422,\"data\":{\"a\":\"Too small\"}}}");
	});

});

describe("Test Transit.discoverNodes", () => {

	const broker = new ServiceBroker({ nodeID: "node1" });
	const transporter = new FakeTransporter();
	const transit = new Transit(broker, transporter);

	transit.publish = jest.fn();

	it("should call publish with correct params", () => {
		transit.discoverNodes();
		expect(transit.publish).toHaveBeenCalledTimes(1);
		expect(transit.publish).toHaveBeenCalledWith(["DISCOVER"], "{\"nodeID\":\"node1\",\"actions\":{}}");
	});

});

describe("Test Transit.sendNodeInfo", () => {

	const broker = new ServiceBroker({ nodeID: "node1" });
	const transporter = new FakeTransporter();
	const transit = new Transit(broker, transporter);

	transit.publish = jest.fn();

	it("should call publish with correct params", () => {
		transit.sendNodeInfo();
		expect(transit.publish).toHaveBeenCalledTimes(1);
		expect(transit.publish).toHaveBeenCalledWith(["INFO"], "{\"nodeID\":\"node1\",\"actions\":{}}");
	});

});

describe("Test Transit.sendHeartbeat", () => {

	const broker = new ServiceBroker({ nodeID: "node1" });
	const transporter = new FakeTransporter();
	const transit = new Transit(broker, transporter);

	transit.publish = jest.fn();

	it("should call publish with correct params", () => {
		transit.sendHeartbeat();
		expect(transit.publish).toHaveBeenCalledTimes(1);
		expect(transit.publish).toHaveBeenCalledWith(["HEARTBEAT"], "{\"nodeID\":\"node1\"}");
	});

});

describe("Test Transit.subscribe", () => {

	const broker = new ServiceBroker({ nodeID: "node1" });
	const transporter = new FakeTransporter();
	const transit = new Transit(broker, transporter);

	transporter.subscribe = jest.fn();

	it("should call transporter.subscribe", () => {
		transit.subscribe(["REQ", "node-2"]);
		expect(transporter.subscribe).toHaveBeenCalledTimes(1);
		expect(transporter.subscribe).toHaveBeenCalledWith(["REQ", "node-2"]);
	});

});

describe("Test Transit.publish", () => {

	const broker = new ServiceBroker({ nodeID: "node1" });
	const transporter = new FakeTransporter();
	const transit = new Transit(broker, transporter);

	transporter.publish = jest.fn();

	it("should call transporter.publish", () => {
		let payload = "John Doe";
		transit.publish(["RES", "node-2"], payload);
		expect(transporter.publish).toHaveBeenCalledTimes(1);
		expect(transporter.publish).toHaveBeenCalledWith(["RES", "node-2"], payload);
	});

});