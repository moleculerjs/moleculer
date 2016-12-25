const utils = require("../../src/utils");
const Context = require("../../src/context");
const ServiceBroker = require("../../src/service-broker");

jest.mock("nats");

let Nats = require("nats");
Nats.connect = jest.fn(() => ({
	on: jest.fn(),
	close: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
	publish: jest.fn()
}));

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
});

describe("Test Transporter.init", () => {

	it("should set broker, nodeID and logger", () => {
		let broker = new ServiceBroker();
		let trans = new NatsTransporter();

		trans.init(broker);
		expect(trans.broker).toBe(broker);
		expect(trans.nodeID).toBe(broker.nodeID);
		expect(trans.logger).toBeDefined();
	});
});

describe("Test Transporter.connect", () => {

	it("should set event listeners", () => {
		let broker = new ServiceBroker();
		let trans = new NatsTransporter();

		trans.init(broker);
		trans.connect();
		expect(trans.client).toBeDefined();
		expect(trans.client.on).toHaveBeenCalledTimes(3);
		expect(trans.client.on).toHaveBeenCalledWith("connect", jasmine.any(Function));
		expect(trans.client.on).toHaveBeenCalledWith("error", jasmine.any(Function));
		expect(trans.client.on).toHaveBeenCalledWith("close", jasmine.any(Function));
	});
});

describe("Test Transporter.disconnect", () => {

	it("should call client.close", () => {
		let trans = new NatsTransporter();
		trans.connect();
		trans.disconnect();
		expect(trans.client.close).toHaveBeenCalledTimes(1);
	});
});

describe("Test Transporter.registerEventHandlers", () => {

	let broker = new ServiceBroker({
		nodeID: "node1"
	});

	let trans = new NatsTransporter();
	trans.init(broker);
	trans.connect();

	it("should subscribe to commands", () => {
		trans.registerEventHandlers();

		expect(trans.client.subscribe).toHaveBeenCalledTimes(4);

		expect(trans.client.subscribe).toHaveBeenCalledWith("IS-TEST.EVENT.>", jasmine.any(Function));
		expect(trans.client.subscribe).toHaveBeenCalledWith("IS-TEST.INFO.node1", jasmine.any(Function));
		expect(trans.client.subscribe).toHaveBeenCalledWith("IS-TEST.REQ.node1.>", jasmine.any(Function));
		expect(trans.client.subscribe).toHaveBeenCalledWith("IS-TEST.DISCOVER", jasmine.any(Function));
	});
});

describe("Test Transporter emit, subscribe and request methods", () => {

	let broker = new ServiceBroker({
		nodeID: "node1"
	});

	let trans = new NatsTransporter();
	trans.init(broker);
	trans.connect();

	it("should publish the message if call emit", () => {
		trans.emit("test.custom.event", { a: 1}, "testParam", true, 100);

		expect(trans.client.publish).toHaveBeenCalledTimes(1);
		expect(trans.client.publish).toHaveBeenCalledWith("IS-TEST.EVENT.test.custom.event", "{\"nodeID\":\"node1\",\"args\":[{\"a\":1},\"testParam\",true,100]}");
	});

	it("should subscibe to eventname", () => {
		trans.subscribe("custom.node.event", jest.fn());

		expect(trans.client.subscribe).toHaveBeenCalledTimes(1);
		expect(trans.client.subscribe).toHaveBeenCalledWith("IS-TEST.custom.node.event", jasmine.any(Function));
	});

	it("should subscribe not response and call publish", () => {
		trans.client.subscribe.mockClear();
		trans.client.publish.mockClear();

		let ctx = new Context({
			action: { name: "posts.find" },
			params: { 
				a: 1
			}
		});
		let p = trans.request("node2", ctx);
		expect(utils.isPromise(p)).toBeTruthy();

		expect(trans.client.subscribe).toHaveBeenCalledTimes(1);
		expect(trans.client.subscribe).toHaveBeenCalledWith("IS-TEST.RESP." + ctx.id, jasmine.any(Function));

		expect(trans.client.publish).toHaveBeenCalledTimes(1);
		expect(trans.client.publish).toHaveBeenCalledWith("IS-TEST.REQ.node2.posts.find", "{\"a\":1}", "IS-TEST.RESP." + ctx.id);
	});
});

describe("Test Transporter.sendNodeInfoPackage", () => {

	let broker = new ServiceBroker({
		nodeID: "node1"
	});
	broker.getLocalActionList = jest.fn();

	let trans = new NatsTransporter();
	trans.init(broker);
	trans.connect();

	it("should call client.publish", () => {
		trans.sendNodeInfoPackage("test.subject", "test.reply.subject");

		expect(broker.getLocalActionList).toHaveBeenCalledTimes(1);
		expect(trans.client.publish).toHaveBeenCalledTimes(1);
		expect(trans.client.publish).toHaveBeenCalledWith("test.subject", "{\"nodeID\":\"node1\"}", "test.reply.subject");
	});

});

describe("Test Transporter.discoverNodes", () => {

	let broker = new ServiceBroker({
		nodeID: "node11"
	});

	let trans = new NatsTransporter();
	trans.init(broker);
	trans.connect();

	trans.sendNodeInfoPackage = jest.fn();

	it("should call sendNodeInfoPackage method with subjects", () => {
		trans.discoverNodes();

		expect(trans.sendNodeInfoPackage).toHaveBeenCalledTimes(1);
		expect(trans.sendNodeInfoPackage).toHaveBeenCalledWith("IS-TEST.DISCOVER", "IS-TEST.INFO.node11");
	});

});