/* eslint-disable no-console */

const Promise = require("bluebird");
const { ServiceBroker } = require("../../../..");
let { extendExpect } = require("../../../unit/utils");

extendExpect(expect);

let FLOW = [];

function createNode(name) {
	const broker = new ServiceBroker({
		nodeID: "event-" + name,
		logger: console,
		transporter: process.env.AMQP_URI || "amqp://guest:guest@localhost:5672",
	});

	broker.createService({
		name: name,
		events: {
			"hello.world"() {
				FLOW.push(this.name);
			}
		}
	});

	return broker;
}

describe("Test AMQPTransporter event broadcast with built-in balancer", () => {

	const pub = createNode("event-pub");
	const sub1 = createNode("event-sub1");
	const sub2 = createNode("event-sub2");
	const sub3 = createNode("event-sub3");

	beforeEach(() => Promise.all([
		pub.start(),
		sub1.start(),
		sub2.start(),
		sub3.start()
	]));

	afterEach(() => Promise.all([
		pub.stop(),
		sub1.stop(),
		sub2.stop(),
		sub3.stop()
	]));

	it("Should send an event to all subscribed nodes.", () => {
		pub.broadcast("hello.world", { testing: true });

		return Promise.delay(2000).then(() => {
			expect(FLOW).toHaveLength(4);
			expect(FLOW).toEqual(expect.arrayContaining([
				"event-pub",
				"event-sub1",
				"event-sub2",
				"event-sub3"
			]));
		});
	});

	/*
	//exec = debugExec;
	beforeEach(() => exec("node", [path.resolve(__dirname, "..", "purge.js")]));
	afterAll(() => exec("node", [path.resolve(__dirname, "..", "purge.js")]));

	it("Should send an event to all subscribed nodes.", () => {
		return Promise.all([
			exec("node", [path.resolve(__dirname,"pub.js")]),
			exec("node", [path.resolve(__dirname,"sub1.js")]),
			exec("node", [path.resolve(__dirname,"sub2.js")]),
			exec("node", [path.resolve(__dirname,"sub3.js")]),
		])
			.then((stdout) => {
				const expectedReceivers = [
					"Publisher",
					"Subscriber1",
					"Subscriber2",
					"Subscriber3",
				].sort();
				expect(findResponse(stdout).sort()).toEqual(expectedReceivers);
			});
	}, 15000);

	it( "Subscribed nodes should not receive events older than 5 seconds.", () => {
		return Promise.all([
			callIn(() => exec("node", [path.resolve(__dirname,"pub.js")]), 200),
			exec("node", [path.resolve(__dirname,"sub1.js")]),
			exec("node", [path.resolve(__dirname,"sub2.js")]),
			callIn(() => exec("node", [path.resolve(__dirname,"sub3.js")]), 6000),
		])
			.then((stdout) => {
				const expectedReceivers = [
					"Publisher",
					"Subscriber1",
					"Subscriber2",
				].sort();
				expect(findResponse(stdout).sort()).toEqual(expectedReceivers);
			});
	}, 20000);

	*/
});
