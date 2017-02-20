const ServiceBroker = require("../src/service-broker");
const Transit = require("../src/transit");
const FakeTransporter = require("../src/transporters/fake");

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