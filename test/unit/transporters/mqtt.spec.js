const ServiceBroker = require("../../../src/service-broker");
const MqttTransporter = require("../../../src/transporters/mqtt");
const { PacketInfo } = require("../../../src/packets");

jest.mock("mqtt");

let MQTT = require("mqtt");
MQTT.connect = jest.fn(() => {
	let onCallbacks = {};
	return {
		on: jest.fn((event, cb) => onCallbacks[event] = cb),
		end: jest.fn(),
		subscribe: jest.fn(),
		publish: jest.fn(),

		onCallbacks
	};
});


describe("Test NatsTransporter constructor", () => {

	it("check constructor", () => {
		let trans = new MqttTransporter();
		expect(trans).toBeDefined();
		expect(trans.opts).toEqual({});
		expect(trans.connected).toBe(false);
		expect(trans.client).toBeNull();
	});

	it("check constructor with string param", () => {
		let trans = new MqttTransporter("mqtt://localhost");
		expect(trans.opts).toEqual({ mqtt: "mqtt://localhost"});
	});

	it("check constructor with options", () => {
		let opts = { mqtt: { host: "localhost", port: 1234} };
		let trans = new MqttTransporter(opts);
		expect(trans.opts).toBe(opts);
	});
});

describe("Test MqttTransporter connect & disconnect", () => {
	let broker = new ServiceBroker();
	let msgHandler = jest.fn();
	let trans;

	beforeEach(() => {
		trans = new MqttTransporter();
		trans.init(broker, msgHandler);
	});

	it("check connect", () => {
		let p = trans.connect().then(() => {
			expect(trans.client).toBeDefined();
			expect(trans.client.on).toHaveBeenCalledTimes(5);
			expect(trans.client.on).toHaveBeenCalledWith("connect", jasmine.any(Function));
			expect(trans.client.on).toHaveBeenCalledWith("error", jasmine.any(Function));
			expect(trans.client.on).toHaveBeenCalledWith("reconnect", jasmine.any(Function));
			expect(trans.client.on).toHaveBeenCalledWith("close", jasmine.any(Function));
			expect(trans.client.on).toHaveBeenCalledWith("message", jasmine.any(Function));
		});

		trans.client.onCallbacks.connect(); // Trigger the `resolve`

		return p;
	});

	it("check disconnect", () => {
		trans.connect();

		let cb = trans.client.end;
		trans.disconnect();
		expect(trans.client).toBeNull();
		expect(cb).toHaveBeenCalledTimes(1);
	});

});


describe("Test NatsTransporter subscribe & publish", () => {
	let trans;
	let msgHandler;

	const fakeTransit = {
		nodeID: "node1",
		serialize: jest.fn(msg => JSON.stringify(msg))
	};	

	beforeEach(() => {
		trans = new MqttTransporter({ prefix: "TEST" });
		let broker = new ServiceBroker();
		msgHandler = jest.fn();
		trans.init(broker, msgHandler);
		trans.connect();
	});

	it("check subscribe", () => {
		trans.subscribe("REQ", "node");

		expect(trans.client.subscribe).toHaveBeenCalledTimes(1);
		expect(trans.client.subscribe).toHaveBeenCalledWith("TEST.REQ.node");
	});

	it("check incoming message handler", () => {
		// Test subscribe callback
		trans.client.onCallbacks.message("prefix.event.name", "incoming data");
		expect(msgHandler).toHaveBeenCalledTimes(1);
		expect(msgHandler).toHaveBeenCalledWith("event", "incoming data");
	});

	it("check publish", () => {
		trans.publish(new PacketInfo(fakeTransit, "node2", {}));

		expect(trans.client.publish).toHaveBeenCalledTimes(1);
		expect(trans.client.publish).toHaveBeenCalledWith("TEST.INFO.node2", "{\"sender\":\"node1\",\"actions\":\"{}\"}");
	});
});
