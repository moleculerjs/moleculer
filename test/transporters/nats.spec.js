const utils = require("../../src/utils");
const Context = require("../../src/context");
const ServiceBroker = require("../../src/service-broker");

jest.mock("nats");

let Nats = require("nats");
Nats.connect = jest.fn(() => {
	let onCallbacks = {};
	return {
		on: jest.fn((event, cb) => onCallbacks[event] = cb),
		close: jest.fn(),
		subscribe: jest.fn(),
		unsubscribe: jest.fn(),
		publish: jest.fn(),

		onCallbacks
	};
});

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

	let broker = new ServiceBroker();
	let trans = new NatsTransporter();
	trans.init(broker);

	it("should set event listeners", () => {
		trans.connect();
		expect(trans.client).toBeDefined();
		expect(trans.client.on).toHaveBeenCalledTimes(3);
		expect(trans.client.on).toHaveBeenCalledWith("connect", jasmine.any(Function));
		expect(trans.client.on).toHaveBeenCalledWith("error", jasmine.any(Function));
		expect(trans.client.on).toHaveBeenCalledWith("close", jasmine.any(Function));
	});

	it("should call registerEventHandlers & discoverNodes after connect event", () => {
		trans.registerEventHandlers = jest.fn();
		trans.discoverNodes = jest.fn();
		trans.client.onCallbacks["connect"]();

		expect(trans.registerEventHandlers).toHaveBeenCalledTimes(1);
		expect(trans.discoverNodes).toHaveBeenCalledTimes(1);
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
	broker.processNodeInfo = jest.fn();
	broker.emitLocal = jest.fn();

	let trans = new NatsTransporter();
	trans.init(broker);
	trans.connect();

	let callbacks = {};

	trans.client.subscribe = jest.fn((subject, cb) => callbacks[subject] = cb);

	it("should subscribe to 4 commands", () => {
		trans.registerEventHandlers();

		expect(trans.client.subscribe).toHaveBeenCalledTimes(4);

		expect(trans.client.subscribe).toHaveBeenCalledWith("IS-TEST.EVENT.>", jasmine.any(Function));
		expect(trans.client.subscribe).toHaveBeenCalledWith("IS-TEST.INFO.node1", jasmine.any(Function));
		expect(trans.client.subscribe).toHaveBeenCalledWith("IS-TEST.REQ.node1.>", jasmine.any(Function));
		expect(trans.client.subscribe).toHaveBeenCalledWith("IS-TEST.DISCOVER", jasmine.any(Function));
	});

	it("should call broker.emitLocal if event command received", () => {
		let payload = { nodeID: "node2", name: "posts.find", args: [{ a: 100 }, "TestString"] };
		callbacks["IS-TEST.EVENT.>"](JSON.stringify(payload));

		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("posts.find", { a: 100 }, "TestString");
	});

	it("should call broker.call if request command received", () => {
		let result = [ { a: 1}, { a: 2}];
		broker.call = jest.fn((actionName, params) => {
			expect(actionName).toBe("posts.find");
			expect(params).toEqual([{ a: 100 }, "TestString"]);
			return Promise.resolve(result);
		});
		let payload = { nodeID: "node2", action: "posts.find", params: [{ a: 100 }, "TestString"] };
		let p = callbacks["IS-TEST.REQ.node1.>"](JSON.stringify(payload), "response.subject");

		expect(broker.call).toHaveBeenCalledTimes(1);
		expect(broker.call).toHaveBeenCalledWith("posts.find", [{ a: 100 }, "TestString"]);

		return p.then(() => {
			expect(trans.client.publish).toHaveBeenCalledTimes(1);
			expect(trans.client.publish).toHaveBeenCalledWith("response.subject", "[{\"a\":1},{\"a\":2}]");
		});
	});

	it("should call broker.processNodeInfo and sendNodeInfoPackage if DISCOVER command received", () => {
		trans.sendNodeInfoPackage = jest.fn();
		let payload = { nodeID: "node2", actions: ["users.get", "users.create"] };
		callbacks["IS-TEST.DISCOVER"](JSON.stringify(payload), "reply_command");

		expect(broker.processNodeInfo).toHaveBeenCalledTimes(1);
		expect(broker.processNodeInfo).toHaveBeenCalledWith(payload);

		expect(trans.sendNodeInfoPackage).toHaveBeenCalledTimes(1);
		expect(trans.sendNodeInfoPackage).toHaveBeenCalledWith("reply_command");
	});

	it("should call broker.processNodeInfo if INFO command received", () => {
		broker.processNodeInfo.mockClear();
		trans.sendNodeInfoPackage = jest.fn();
		let payload = { nodeID: "node2", actions: ["users.get", "users.create"] };
		callbacks["IS-TEST.INFO.node1"](JSON.stringify(payload));

		expect(broker.processNodeInfo).toHaveBeenCalledTimes(1);
		expect(broker.processNodeInfo).toHaveBeenCalledWith(payload);
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
		expect(trans.client.publish).toHaveBeenCalledWith("IS-TEST.EVENT.test.custom.event", "{\"nodeID\":\"node1\",\"event\":\"test.custom.event\",\"args\":[{\"a\":1},\"testParam\",true,100]}");
	});

	it("should subscribe to eventname", () => {
		trans.subscribe("custom.node.event", jest.fn());

		expect(trans.client.subscribe).toHaveBeenCalledTimes(1);
		expect(trans.client.subscribe).toHaveBeenCalledWith("IS-TEST.custom.node.event", jasmine.any(Function));
	});

	describe("check response of request", () => {
		let data1 = {
			a: 1,
			b: false,
			c: "Test",
			d: {
				e: 55
			}
		};
		let responseCb;
		trans.client.subscribe = jest.fn((reply, cb) => {
			responseCb = cb;
			return 55;
		});

		it("should subscribe to response and call publish with response as JSON", () => {
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
			expect(trans.client.publish).toHaveBeenCalledWith("IS-TEST.REQ.node2.posts.find", `{\"nodeID\":\"node1\",\"requestID\":\"${ctx.id}\",\"action\":\"posts.find\",\"params\":{\"a\":1}}`, "IS-TEST.RESP." + ctx.id);

			responseCb(JSON.stringify(data1));

			return p.then(response => {
				expect(response).toEqual(data1);
				expect(trans.client.unsubscribe).toHaveBeenCalledTimes(1);
				expect(trans.client.unsubscribe).toHaveBeenCalledWith(55);
			});
		});

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