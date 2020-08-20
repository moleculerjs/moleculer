/* eslint-disable no-console */

const { ServiceBroker } = require("../../..");
const { protectReject } = require("../../unit/utils");

let FLOW = [];

const generateNamespace = (base = "test-broadcast") => `${base}-${Math.floor((Math.random() * Date.now())).toString(36)}`;

const createNode = (name, namespace = "test", serviceName = "broadcast-handler", disableBalancer = false) => {
	const broker = new ServiceBroker({
		namespace,
		nodeID: `event-${name}`,
		logger: false,
		//logger: console,
		//logLevel: "error",
		transporter: process.env.TEST_NATS_URI || "nats://127.0.0.1:4222",
		disableBalancer
	});

	broker.createService({
		name: serviceName,
		events: {
			"hello.world"(payload) {
				this.logger.error("RECEIVED EVENT!");
				if (payload.testing === true)
					FLOW.push(`${this.broker.nodeID}-${this.name}`);
			}
		}
	});

	return broker;
};

describe("Test NATS transporter", () => {

	describe("Test NATS transporter event broadcast with built-in balancer", () => {
		const namespace = generateNamespace();

		const pub = createNode("pub", namespace);
		const sub1 = createNode("sub1", namespace);
		const sub2 = createNode("sub2", namespace);
		const sub3 = createNode("sub3", namespace, "other-handler");
		const sub4 = createNode("sub4", namespace);

		beforeEach(() => {
			FLOW = [];
			Promise.delay(1000).then(() => sub4.start());

			return Promise.all([
				pub.start(),
				sub1.start(),
				sub2.start(),
				sub3.start()
			]).delay(500);
		});

		afterEach(() => Promise.all([
			pub.stop(),
			sub1.stop(),
			sub2.stop(),
			sub3.stop(),
			sub4.stop()
		]));

		it("should send an event to all subscribed nodes", () => {
			pub.broadcast("hello.world", { testing: true });

			return Promise.delay(2000).catch(protectReject).then(() => {
				expect(FLOW).toHaveLength(4);
				expect(FLOW).toEqual(expect.arrayContaining([
					"event-pub-broadcast-handler",
					"event-sub1-broadcast-handler",
					"event-sub2-broadcast-handler",
					"event-sub3-other-handler"
				]));
			});
		}, 10000);
	});

	describe("Test NATS transporter event broadcast with DISABLED built-in balancer", () => {
		const namespace = generateNamespace();

		const pub = createNode("pub", namespace, undefined, true);
		const sub1 = createNode("sub1", namespace, undefined, true);
		const sub2 = createNode("sub2", namespace, undefined, true);
		const sub3 = createNode("sub3", namespace, "other-handler", true);
		const sub4 = createNode("sub4", namespace, undefined, true);

		beforeEach(() => {
			FLOW = [];
			Promise.delay(1000).catch(protectReject).then(() => sub4.start());

			return Promise.all([
				pub.start(),
				sub1.start(),
				sub2.start(),
				sub3.start()
			]).delay(500);
		});

		afterEach(() => Promise.all([
			pub.stop(),
			sub1.stop(),
			sub2.stop(),
			sub3.stop(),
			sub4.stop()
		]));

		it("should send an event to all subscribed nodes", () => {
			pub.broadcast("hello.world", { testing: true });

			return Promise.delay(2000).catch(protectReject).then(() => {
				expect(FLOW).toHaveLength(4);
				expect(FLOW).toEqual(expect.arrayContaining([
					"event-pub-broadcast-handler",
					"event-sub1-broadcast-handler",
					"event-sub2-broadcast-handler",
					"event-sub3-other-handler"
				]));
			});
		}, 10000);
	});

	describe("Test NATS transporter event broadcastLocal with built-in balancer", () => {
		const namespace = generateNamespace();

		const pub = createNode("pub", namespace);
		const sub1 = createNode("sub1", namespace);
		const sub2 = createNode("sub2", namespace);
		const sub3 = createNode("sub3", namespace);

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

		it("should send an event to local services", () => {
			for(let i = 0; i < 3; i++)
				pub.broadcastLocal("hello.world", { testing: true });

			return Promise.delay(2000).catch(protectReject).then(() => {
				expect(FLOW).toEqual([
					"event-pub-broadcast-handler",
					"event-pub-broadcast-handler",
					"event-pub-broadcast-handler"
				]);
			});
		}, 10000);
	});

});
