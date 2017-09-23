/* eslint-disable no-console */

const Promise = require("bluebird");
const { ServiceBroker } = require("../../..");
let { extendExpect, protectReject } = require("../../unit/utils");

extendExpect(expect);

function createNode(name, disableBalancer = false, service) {
	const broker = new ServiceBroker({
		namespace: "broadcast",
		nodeID: "rpc-" + name,
		//logger: console,
		//logLevel: "debug",
		transporter: process.env.AMQP_URI || "amqp://guest:guest@localhost:5672",
		disableBalancer
	});

	if (service)
		broker.createService(service);

	return broker;
}

describe("Test AMQPTransporter RPC with built-in balancer", () => {

	const client = createNode("client", false);

	const worker1 = createNode("worker1", false, {
		name: "test",
		actions: {
			hello() {
				return Promise.resolve(`Hello from ${this.broker.nodeID}`);
			}
		}
	});

	const worker2 = createNode("worker2", false, {
		name: "test",
		actions: {
			hello() {
				return Promise.resolve(`Hello from ${this.broker.nodeID}`).delay(200);
			}
		}
	});

	const worker3 = createNode("worker3", false, {
		name: "test",
		actions: {
			hello() {
				return Promise.resolve(`Hello from ${this.broker.nodeID}`);
			}
		}
	});

	beforeEach(() => {
		return Promise.all([
			client.start(),
			worker1.start(),
			worker2.start(),
			worker3.start(),
		]);
	});

	afterEach(() => Promise.all([
		client.stop(),
		worker1.stop(),
		worker2.stop(),
		worker3.stop(),
	]));

	it("Should send an event to all subscribed nodes.", () => {
		return Promise.delay(2000).then(() => {
			return Promise.all([
				client.call("test.hello"),
				client.call("test.hello"),
				client.call("test.hello"),
				client.call("test.hello"),
				client.call("test.hello"),
				client.call("test.hello"),
			]).catch(protectReject).then(res => {
				//console.log(res);
				expect(res).toHaveLength(6);
				expect(res).toEqual(expect.arrayContaining([
					"Hello from rpc-worker1",
					"Hello from rpc-worker2",
					"Hello from rpc-worker3",
				]));
				expect(res.filter(n => n == "Hello from rpc-worker1")).toHaveLength(2);
				expect(res.filter(n => n == "Hello from rpc-worker2")).toHaveLength(2);
				expect(res.filter(n => n == "Hello from rpc-worker3")).toHaveLength(2);
			});
		});
	}, 10000);
});

describe("Test AMQPTransporter RPC with DISABLED built-in balancer", () => {

	const client = createNode("client", true);

	const worker1 = createNode("worker1", true, {
		name: "test",
		actions: {
			hello() {
				return Promise.resolve(`Hello from ${this.broker.nodeID}`);
			}
		}
	});

	const worker2 = createNode("worker2", true, {
		name: "test",
		actions: {
			hello() {
				return Promise.resolve(`Hello from ${this.broker.nodeID}`).delay(200);
			}
		}
	});

	const worker3 = createNode("worker3", true, {
		name: "test",
		actions: {
			hello() {
				return Promise.resolve(`Hello from ${this.broker.nodeID}`);
			}
		}
	});

	beforeEach(() => {
		return Promise.all([
			client.start(),
			worker1.start(),
			worker2.start(),
			worker3.start(),
		]);
	});

	afterEach(() => Promise.all([
		client.stop(),
		worker1.stop(),
		worker2.stop(),
		worker3.stop(),
	]));

	it("Should use availability-based load balancing", () => {
		return Promise.delay(2000).then(() => {
			return Promise.all([
				client.call("test.hello"),
				client.call("test.hello"),
				client.call("test.hello"),
				client.call("test.hello"),
				client.call("test.hello"),
				client.call("test.hello"),
			]).catch(protectReject).then(res => {
				console.log(res);
				expect(res).toHaveLength(6);
				expect(res).toEqual(expect.arrayContaining([
					"Hello from rpc-worker1",
					"Hello from rpc-worker2",
					"Hello from rpc-worker3",
				]));

				// worker2 is slow, so it received only 1 request.
				expect(res.filter(n => n == "Hello from rpc-worker2")).toHaveLength(1);
			});
		});
	}, 10000);
});
