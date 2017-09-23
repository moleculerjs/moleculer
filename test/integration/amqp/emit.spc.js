/* eslint-disable no-console */

const Promise = require("bluebird");
const { ServiceBroker } = require("../../..");
let { extendExpect, protectReject } = require("../../unit/utils");

extendExpect(expect);

let FLOW = [];

function createNode(name, serviceName = "emit-handler", disableBalancer = false) {
	const broker = new ServiceBroker({
		namespace: "test-emit",
		nodeID: "event-" + name,
		//logger: console,
		//logLevel: name == "pub"? "debug" : "error",
		transporter: process.env.AMQP_URI || "amqp://guest:guest@localhost:5672",
		disableBalancer,
		registry: {
			preferLocal: false
		}
	});

	broker.createService({
		name: serviceName,
		events: {
			"hello.world2"(payload) {
				this.logger.error("RECEIVED EVENT!");
				if (payload.testing === true)
					FLOW.push(name);
			}
		}
	});

	return broker;
}

describe("Test AMQPTransporter event emit with built-in balancer", () => {

	const pub = createNode("pub");
	const sub1 = createNode("sub1");
	const sub2 = createNode("sub2");
	const sub3 = createNode("sub3", "other-handler");

	beforeAll(() => {
		FLOW = [];
		return Promise.all([
			pub.start(),
			sub1.start(),
			sub2.start(),
			sub3.start()
		]).delay(200);
	});

	afterAll(() => Promise.all([
		pub.stop(),
		sub1.stop(),
		sub2.stop(),
		sub3.stop(),
	]));

	it("should send emit event only one service", () => {
		for(let i = 0; i < 6; i++)
			pub.emit("hello.world2", { testing: true });

		return Promise.delay(2000).catch(protectReject).then(() => {
			//console.log(FLOW);
			expect(FLOW).toHaveLength(12);
			expect(FLOW).toEqual(expect.arrayContaining([
				"pub",
				"sub1",
				"sub2",
				"sub3"
			]));
			expect(FLOW.filter(n => n == "sub3")).toHaveLength(6);
		});
	});
});


describe("Test AMQPTransporter event emit with DISABLED built-in balancer", () => {

	const pub = createNode("pub", "emit-handler", true);
	const sub1 = createNode("sub1", "emit-handler", true);
	const sub2 = createNode("sub2", "emit-handler", true);
	const sub3 = createNode("sub3", "other-handler", true);

	beforeAll(() => {
		FLOW = [];
		return Promise.all([
			pub.start(),
			sub1.start(),
			sub2.start(),
			sub3.start()
		]).delay(200);
	});

	afterAll(() => Promise.all([
		pub.stop(),
		sub1.stop(),
		sub2.stop(),
		sub3.stop(),
	]));

	it("should send emit event only one service", () => {
		for(let i = 0; i < 6; i++)
			pub.emit("hello.world2", { testing: true });

		return Promise.delay(2000).catch(protectReject).then(() => {
			//console.log(FLOW);
			expect(FLOW).toHaveLength(12);
			expect(FLOW).toEqual(expect.arrayContaining([
				"pub",
				"sub1",
				"sub2",
				"sub3"
			]));
			expect(FLOW.filter(n => n == "sub3")).toHaveLength(6);
		});
	});
});
