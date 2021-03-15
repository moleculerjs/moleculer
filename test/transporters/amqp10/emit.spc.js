/* eslint-disable no-console */

const { ServiceBroker } = require("../../..");
const { extendExpect, protectReject } = require("../../unit/utils");
// const purge = require("./purge");

extendExpect(expect);

let FLOW = [];

let namespace =
	"test-emit-" +
	Math.random()
		.toString(36)
		.substring(2, 15);

function createNode(name, serviceName = "emit-handler", disableBalancer = false) {
	const broker = new ServiceBroker({
		namespace,
		nodeID: "event-" + name,
		logger: false,
		//logger: console,
		//logLevel: name == "pub"? "debug" : "error",
		transporter: process.env.AMQP_URI || "amqp10://admin:admin@localhost:5672",
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
				if (payload.testing === true) FLOW.push(name);
			}
		}
	});

	return broker;
}

describe("Test AMQPTransporter Emit", () => {
	// Delete all queues and exchanges before and after suite
	beforeAll(() => {
		namespace =
			"test-emit-" +
			Math.random()
				.toString(36)
				.substring(2, 15);
	});
	afterAll(() => {
		namespace =
			"test-emit-" +
			Math.random()
				.toString(36)
				.substring(2, 15);
	});

	// // Clear all queues between each test.
	// afterEach(() => purge(purgeList));

	describe("Test AMQPTransporter event emit with built-in balancer", () => {
		const pub = createNode("pub");
		const sub1 = createNode("sub1");
		const sub2 = createNode("sub2");
		const sub3 = createNode("sub3", "other-handler");

		// Reset Flow array and start services
		beforeEach(() => {
			FLOW = [];
			return Promise.all([pub.start(), sub1.start(), sub2.start(), sub3.start()]).delay(1000);
		});

		// Stop services and clear queues
		afterEach(() => Promise.all([pub.stop(), sub1.stop(), sub2.stop(), sub3.stop()]));

		it("should send emit event to only one service", () => {
			for (let i = 0; i < 6; i++) pub.emit("hello.world2", { testing: true });

			return Promise.delay(2000)
				.catch(protectReject)
				.then(() => {
					expect(FLOW).toHaveLength(12);
					expect(FLOW).toEqual(expect.arrayContaining(["pub", "sub1", "sub2", "sub3"]));
					expect(FLOW.filter(n => n == "sub3")).toHaveLength(6);
				});
		});
	});

	describe("Test AMQPTransporter event emit with DISABLED built-in balancer", () => {
		const pub = createNode("pub", "emit-handler", true);
		const sub1 = createNode("sub1", "emit-handler", true);
		const sub2 = createNode("sub2", "emit-handler", true);
		const sub3 = createNode("sub3", "other-handler", true);

		// Reset Flow array and start services
		beforeEach(() => {
			FLOW = [];
			return Promise.all([pub.start(), sub1.start(), sub2.start(), sub3.start()]).delay(1000);
		});

		// Stop services and clear queues
		afterEach(() => Promise.all([pub.stop(), sub1.stop(), sub2.stop(), sub3.stop()]));

		it("should send emit event only one service", () => {
			for (let i = 0; i < 6; i++) pub.emit("hello.world2", { testing: true });

			return Promise.delay(2000)
				.catch(protectReject)
				.then(() => {
					expect(FLOW).toHaveLength(12);
					expect(FLOW).toEqual(expect.arrayContaining(["pub", "sub1", "sub2", "sub3"]));
					expect(FLOW.filter(n => n == "sub3")).toHaveLength(6);
				});
		});
	});
});

// const purgeList = {
// 	queues: [
// 		// Includes auto-delete queue's in case default settings change
// 		"MOL-test-emit.DISCONNECT.event-pub",
// 		"MOL-test-emit.DISCONNECT.event-sub1",
// 		"MOL-test-emit.DISCONNECT.event-sub2",
// 		"MOL-test-emit.DISCONNECT.event-sub3",
// 		"MOL-test-emit.DISCOVER.event-pub",
// 		"MOL-test-emit.DISCOVER.event-sub1",
// 		"MOL-test-emit.DISCOVER.event-sub2",
// 		"MOL-test-emit.DISCOVER.event-sub3",
// 		"MOL-test-emit.EVENT.event-pub",
// 		"MOL-test-emit.EVENT.event-sub1",
// 		"MOL-test-emit.EVENT.event-sub2",
// 		"MOL-test-emit.EVENT.event-sub3",
// 		"MOL-test-emit.EVENTB.emit-handler.hello.world2",
// 		"MOL-test-emit.EVENTB.other-handler.hello.world2",
// 		"MOL-test-emit.HEARTBEAT.event-pub",
// 		"MOL-test-emit.HEARTBEAT.event-sub1",
// 		"MOL-test-emit.HEARTBEAT.event-sub2",
// 		"MOL-test-emit.HEARTBEAT.event-sub3",
// 		"MOL-test-emit.INFO.event-pub",
// 		"MOL-test-emit.INFO.event-sub1",
// 		"MOL-test-emit.INFO.event-sub2",
// 		"MOL-test-emit.INFO.event-sub3",
// 		"MOL-test-emit.PING.event-pub",
// 		"MOL-test-emit.PING.event-sub1",
// 		"MOL-test-emit.PING.event-sub2",
// 		"MOL-test-emit.PING.event-sub3",
// 		"MOL-test-emit.PONG.event-pub",
// 		"MOL-test-emit.PONG.event-sub1",
// 		"MOL-test-emit.PONG.event-sub2",
// 		"MOL-test-emit.PONG.event-sub3",
// 		"MOL-test-emit.REQ.event-pub",
// 		"MOL-test-emit.REQ.event-sub1",
// 		"MOL-test-emit.REQ.event-sub2",
// 		"MOL-test-emit.REQ.event-sub3",
// 		"MOL-test-emit.REQB.$node.actions",
// 		"MOL-test-emit.REQB.$node.events",
// 		"MOL-test-emit.REQB.$node.health",
// 		"MOL-test-emit.REQB.$node.list",
// 		"MOL-test-emit.REQB.$node.services",
// 		"MOL-test-emit.RES.event-pub",
// 		"MOL-test-emit.RES.event-sub1",
// 		"MOL-test-emit.RES.event-sub2",
// 		"MOL-test-emit.RES.event-sub3"
// 	],
// 	exchanges: [
// 		"MOL-test-emit.DISCONNECT",
// 		"MOL-test-emit.DISCOVER",
// 		"MOL-test-emit.HEARTBEAT",
// 		"MOL-test-emit.INFO",
// 		"MOL-test-emit.PING"
// 	]
// };
