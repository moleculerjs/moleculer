/* eslint-disable no-console */

const { ServiceBroker } = require("../../..");
const { protectReject } = require("../../unit/utils");

let FLOW = [];

const generateNamespace = (base = "test-emit") => `${base}-${Math.floor((Math.random() * Date.now())).toString(36)}`;

const createNode = (name, namespace = "test", serviceName = "emit-handler", disableBalancer = false) => {
	const broker = new ServiceBroker({
		namespace,
		nodeID: `event-${name}`,
		logger: false,
		//logger: console,
		//logLevel: name == "pub" ? "debug" : "error",
		transporter: process.env.TEST_NATS_URI || "nats://127.0.0.1:4222",
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
					FLOW.push(`${this.broker.nodeID}-${this.name}`);
			}
		}
	});

	return broker;
};

describe("Test NATS transporter", () => {

	describe("Test NATS transporter event emit with built-in balancer", () => {
		const namespace = generateNamespace();

		const pub = createNode("pub", namespace);
		const sub1 = createNode("sub1", namespace);
		const sub2 = createNode("sub2", namespace);
		const sub3 = createNode("sub3", namespace, "other-handler");

		beforeEach(() => {
			FLOW = [];
			return Promise.all([
				pub.start(),
				sub1.start(),
				sub2.start(),
				sub3.start()
			]).delay(1000);
		});

		afterEach(() => Promise.all([
			pub.stop(),
			sub1.stop(),
			sub2.stop(),
			sub3.stop(),
		]));

		it("should send emit event to only one service", () => {
			for(let i = 0; i < 6; i++)
				pub.emit("hello.world2", { testing: true });

			return Promise.delay(2000).catch(protectReject).then(() => {
				expect(FLOW).toHaveLength(12);
				expect(FLOW).toEqual(expect.arrayContaining([
					"event-pub-emit-handler",
					"event-sub1-emit-handler",
					"event-sub2-emit-handler",
					"event-sub3-other-handler"
				]));
				expect(FLOW.filter(n => n == "event-sub3-other-handler")).toHaveLength(6);
			});
		});
	});

	describe("Test NATS transporter event emit with DISABLED built-in balancer", () => {
		const namespace = generateNamespace();

		const pub = createNode("pub", namespace, "emit-handler", true);
		const sub1 = createNode("sub1", namespace, "emit-handler", true);
		const sub2 = createNode("sub2", namespace, "emit-handler", true);
		const sub3 = createNode("sub3", namespace, "other-handler", true);

		beforeEach(() => {
			FLOW = [];
			return Promise.all([
				pub.start(),
				sub1.start(),
				sub2.start(),
				sub3.start()
			]).delay(1000);
		});

		afterEach(() => Promise.all([
			pub.stop(),
			sub1.stop(),
			sub2.stop(),
			sub3.stop(),
		]));

		it("should send emit event to only one service", () => {
			for(let i = 0; i < 10; i++)
				pub.emit("hello.world2", { testing: true });

			return Promise.delay(2000).catch(protectReject).then(() => {
				expect(FLOW).toHaveLength(20);
				expect(FLOW).toEqual(expect.arrayContaining([
					"event-pub-emit-handler",
					"event-sub1-emit-handler",
					"event-sub2-emit-handler",
					"event-sub3-other-handler"
				]));
				expect(FLOW.filter(n => n == "event-sub3-other-handler")).toHaveLength(10);
			});
		});
	});

});
