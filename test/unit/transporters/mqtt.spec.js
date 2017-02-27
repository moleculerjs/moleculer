const ServiceBroker = require("../../../src/service-broker");
const MqttTransporter = require("../../../src/transporters/mqtt");

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

describe("Test MqttTransporter connect & disconnect", () => {
	let broker = new ServiceBroker();
	let msgHandler = jest.fn();
	let trans;

	beforeEach(() => {
		trans = new MqttTransporter();
		trans.init(broker, msgHandler);
	});

	it("check constructor", () => {
		expect(trans).toBeDefined();
		expect(trans.connected).toBeFalsy();
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

		trans.client.onCallbacks.connect();

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

	it("check subscribe", () => {
		let opts = { prefix: "TEST" };
		let msgHandler = jest.fn();
		let trans = new MqttTransporter(opts);
		let broker = new ServiceBroker();
		trans.init(broker, msgHandler);
		trans.connect();

		trans.subscribe(["REQ", "node"]);

		expect(trans.client.subscribe).toHaveBeenCalledTimes(1);
		expect(trans.client.subscribe).toHaveBeenCalledWith("TEST.REQ.node");
	});

	it("check incoming message handler", () => {
		let opts = { prefix: "TEST" };
		let msgHandler = jest.fn();
		let trans = new MqttTransporter(opts);
		let broker = new ServiceBroker();
		trans.init(broker, msgHandler);
		trans.connect();

		// Test subscribe callback
		trans.client.onCallbacks.message("prefix.event.name", "incoming data");
		expect(msgHandler).toHaveBeenCalledTimes(1);
		expect(msgHandler).toHaveBeenCalledWith(["event", "name"], "incoming data");
	});

	it("check publish", () => {
		let msgHandler = jest.fn();
		let trans = new MqttTransporter();
		let broker = new ServiceBroker();
		trans.init(broker, msgHandler);
		trans.connect();

		trans.publish(["REQ", "node"], "data");

		expect(trans.client.publish).toHaveBeenCalledTimes(1);
		expect(trans.client.publish).toHaveBeenCalledWith("MOL.REQ.node", "data");
	});
});
