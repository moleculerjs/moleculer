/* eslint-disable no-console */

const Promise = require("bluebird");
const { ServiceBroker } = require("../../..");
let { extendExpect, protectReject } = require("../../unit/utils");
const purge = require("./purge");

extendExpect(expect);

let FLOW = [];

function createNode(name, disableBalancer = false) {
	const broker = new ServiceBroker({
		namespace: "test-broadcast",
		nodeID: "event-" + name,
		//logger: console,
		//logLevel: "error",
		transporter: process.env.AMQP_URI || "amqp://guest:guest@localhost:5672",
		disableBalancer
	});

	broker.createService({
		name: name,
		events: {
			"hello.world"(payload) {
				this.logger.error("RECEIVED EVENT!");
				if (payload.testing === true)
					FLOW.push(this.name);
			}
		}
	});

	return broker;
}

describe("Test AMQPTransporter", () => {

	beforeAll(() => purge(purgeList));
	afterAll(() => purge(purgeList));

	describe("Test AMQPTransporter event broadcast with built-in balancer", () => {

		const pub = createNode("pub");
		const sub1 = createNode("sub1");
		const sub2 = createNode("sub2");
		const sub3 = createNode("sub3");

		beforeEach(() => {
			FLOW = [];
			Promise.delay(1000).then(() => sub3.start());

			return Promise.all([
				pub.start(),
				sub1.start(),
				sub2.start()
			]);
		});

		afterEach(() => Promise.all([
			pub.stop(),
			sub1.stop(),
			sub2.stop(),
			sub3.stop()
		]));

		it("Should send an event to all subscribed nodes.", () => {
			pub.broadcast("hello.world", { testing: true });

			return Promise.delay(2000).catch(protectReject).then(() => {
				expect(FLOW).toHaveLength(3);
				expect(FLOW).toEqual(expect.arrayContaining([
					"pub",
					"sub1",
					"sub2"
				]));
			});
		}, 10000);
	});


	describe("Test AMQPTransporter event broadcast with DISABLED built-in balancer", () => {

		const pub = createNode("pub", true);
		const sub1 = createNode("sub1", true);
		const sub2 = createNode("sub2", true);
		const sub3 = createNode("sub3", true);

		beforeEach(() => {
			FLOW = [];
			Promise.delay(1000).catch(protectReject).then(() => sub3.start());

			return Promise.all([
				pub.start(),
				sub1.start(),
				sub2.start()
			]);
		});

		afterEach(() => Promise.all([
			pub.stop(),
			sub1.stop(),
			sub2.stop(),
			sub3.stop()
		]));

		it("Should send an event to all subscribed nodes.", () => {
			pub.broadcast("hello.world", { testing: true });

			return Promise.delay(2000).catch(protectReject).then(() => {
				expect(FLOW).toHaveLength(3);
				expect(FLOW).toEqual(expect.arrayContaining([
					"pub",
					"sub1",
					"sub2"
				]));
			});
		}, 10000);
	});

	describe("Test AMQPTransporter event broadcastLocal with built-in balancer", () => {

		const pub = createNode("pub");
		const sub1 = createNode("sub1");
		const sub2 = createNode("sub2");
		const sub3 = createNode("sub3");

		beforeEach(() => {
			FLOW = [];
			Promise.delay(1000).then(() => sub3.start());

			return Promise.all([
				pub.start(),
				sub1.start(),
				sub2.start()
			]);
		});

		afterEach(() => Promise.all([
			pub.stop(),
			sub1.stop(),
			sub2.stop(),
			sub3.stop()
		]));

		it("Should send an event to local services.", () => {
			for(let i = 0; i < 3; i++)
				pub.broadcastLocal("hello.world", { testing: true });

			return Promise.delay(2000).catch(protectReject).then(() => {
				// console.log(FLOW);
				expect(FLOW).toEqual([
					"pub",
					"pub",
					"pub"
				]);
			});
		}, 10000);
	});

});

const purgeList = {
	queues: [
		"MOL-test-broadcast.EVENTB.pub.hello.world",
		"MOL-test-broadcast.EVENTB.sub1.hello.world",
		"MOL-test-broadcast.EVENTB.sub2.hello.world",
		"MOL-test-broadcast.EVENTB.sub3.hello.world",
		"MOL-test-broadcast.REQ.event-pub",
		"MOL-test-broadcast.REQ.event-sub1",
		"MOL-test-broadcast.REQ.event-sub2",
		"MOL-test-broadcast.REQ.event-sub3",
		"MOL-test-broadcast.REQB.$node.actions",
		"MOL-test-broadcast.REQB.$node.events",
		"MOL-test-broadcast.REQB.$node.health",
		"MOL-test-broadcast.REQB.$node.list",
		"MOL-test-broadcast.REQB.$node.services",
		"MOL-test-broadcast.RES.event-pub",
		"MOL-test-broadcast.RES.event-sub1",
		"MOL-test-broadcast.RES.event-sub2",
		"MOL-test-broadcast.RES.event-sub3",
	],

	exchanges: [
		"MOL-test-broadcast.DISCONNECT",
		"MOL-test-broadcast.DISCOVER",
		"MOL-test-broadcast.HEARTBEAT",
		"MOL-test-broadcast.INFO",
		"MOL-test-broadcast.PING",
	]
};
