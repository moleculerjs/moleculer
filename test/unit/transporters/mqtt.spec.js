const ServiceBroker = require("../../../src/service-broker");
const Transit = require("../../../src/transit");
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
		let transporter = new MqttTransporter();
		expect(transporter).toBeDefined();
		expect(transporter.opts).toEqual({});
		expect(transporter.connected).toBe(false);
		expect(transporter.client).toBeNull();
	});

	it("check constructor with string param", () => {
		let transporter = new MqttTransporter("mqtt://localhost");
		expect(transporter.opts).toEqual({ mqtt: "mqtt://localhost"});
	});

	it("check constructor with options", () => {
		let opts = { mqtt: { host: "localhost", port: 1234} };
		let transporter = new MqttTransporter(opts);
		expect(transporter.opts).toBe(opts);
	});
});

describe("Test MqttTransporter connect & disconnect", () => {
	let broker = new ServiceBroker();
	let transit = new Transit(broker);
	let msgHandler = jest.fn();
	let transporter;

	beforeEach(() => {
		transporter = new MqttTransporter();
		transit.tx = transporter;
		transporter.init(transit, msgHandler);
	});

	it("check connect", () => {
		let p = transporter.connect().then(() => {
			expect(transporter.client).toBeDefined();
			expect(transporter.client.on).toHaveBeenCalledTimes(5);
			expect(transporter.client.on).toHaveBeenCalledWith("connect", jasmine.any(Function));
			expect(transporter.client.on).toHaveBeenCalledWith("error", jasmine.any(Function));
			expect(transporter.client.on).toHaveBeenCalledWith("reconnect", jasmine.any(Function));
			expect(transporter.client.on).toHaveBeenCalledWith("close", jasmine.any(Function));
			expect(transporter.client.on).toHaveBeenCalledWith("message", jasmine.any(Function));
		});

		transporter._client.onCallbacks.connect(); // Trigger the `resolve`

		return p;
	});

	it("check disconnect", () => {
		let p = transporter.connect().then(() => {
			let cb = transporter.client.end;
			transporter.disconnect();
			expect(transporter.client).toBeNull();
			expect(cb).toHaveBeenCalledTimes(1);

		});

		transporter._client.onCallbacks.connect(); // Trigger the `resolve`
		return p;
	});

});


describe("Test MqttTransporter subscribe & publish", () => {
	let transporter;
	let msgHandler;

	const fakeTransit = {
		nodeID: "node1",
		serialize: jest.fn(msg => JSON.stringify(msg))
	};	

	beforeEach(() => {
		transporter = new MqttTransporter({ prefix: "TEST" });
		let broker = new ServiceBroker();
		let transit = new Transit(broker);		
		transit.tx = transporter;
		msgHandler = jest.fn();
		transporter.init(transit, msgHandler);
		let p = transporter.connect();
		transporter._client.onCallbacks.connect(); // Trigger the `resolve`
		return p;
	});

	it("check subscribe", () => {
		transporter.client.subscribe.mockClear();
		transporter.subscribe("REQ", "node");

		expect(transporter.client.subscribe).toHaveBeenCalledTimes(1);
		expect(transporter.client.subscribe).toHaveBeenCalledWith("TEST.REQ.node");
	});

	it("check incoming message handler", () => {
		// Test subscribe callback
		transporter.client.onCallbacks.message("prefix.event.name", "incoming data");
		expect(msgHandler).toHaveBeenCalledTimes(1);
		expect(msgHandler).toHaveBeenCalledWith("event", "incoming data");
	});

	it("check publish", () => {
		transporter.client.publish.mockClear();
		transporter.publish(new PacketInfo(fakeTransit, "node2", {}));

		expect(transporter.client.publish).toHaveBeenCalledTimes(1);
		expect(transporter.client.publish).toHaveBeenCalledWith("TEST.INFO.node2", "{\"sender\":\"node1\",\"actions\":\"{}\"}");
	});
});
