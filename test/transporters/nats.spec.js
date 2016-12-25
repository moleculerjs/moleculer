const utils = require("../../src/utils");
const ServiceBroker = require("../../src/service-broker");

jest.mock("nats");

const NatsTransporter = require("../../src/transporters/nats");

describe("Test Transporter constructor", () => {

	it("should create an empty options", () => {
		let trans = new NatsTransporter();
		expect(trans).toBeDefined();
		expect(trans.opts).toBeDefined();
	});

	it("should set options", () => {
		let opts = { prefix: "IS-TEST" };
		let trans = new NatsTransporter(opts);
		expect(trans).toBeDefined();
		expect(trans.opts).toBe(opts);
	});

	it("check init", () => {
		let broker = new ServiceBroker();
		let trans = new NatsTransporter();

		trans.init(broker);
		expect(trans.broker).toBe(broker);
		expect(trans.nodeID).toBe(broker.nodeID);
		expect(trans.logger).toBeDefined();
	});

	it("should create a client if call connect", () => {
		let broker = new ServiceBroker();
		let trans = new NatsTransporter();

		trans.init(broker);
		trans.connect();
		expect(trans.client).toBeDefined();
	});
});
