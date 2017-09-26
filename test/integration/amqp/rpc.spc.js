/* eslint-disable no-console */

const Promise = require("bluebird");
const { ServiceBroker } = require("../../..");
let { extendExpect, protectReject } = require("../../unit/utils");
const purge = require("./purge");

extendExpect(expect);

function createNode(name, disableBalancer = false, service) {
	const broker = new ServiceBroker({
		namespace: "test-rpc",
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

describe("Test AMQPTransporter", () => {

	beforeAll(() => purge(purgeList));
	afterAll(() => purge(purgeList));

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
					//console.log(res);
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

	describe("Test AMQPTransporter RPC with DISABLED built-in balancer & retried request", () => {

		const client = createNode("client", true);
		let worker2CB = jest.fn();

		const worker1 = createNode("worker1", true, {
			name: "test",
			actions: {
				hello(ctx) {
					return Promise.resolve({
						worker: "worker1",
						a: ctx.params.a
					});
				}
			}
		});

		const worker2 = createNode("worker2", true, {
			name: "test",
			actions: {
				hello() {
					worker2CB();
					return worker2.stop();
					//return Promise.resolve(`Hello from ${this.broker.nodeID}`).delay(200);
				}
			}
		});

		const worker3 = createNode("worker3", true, {
			name: "test",
			actions: {
				hello(ctx) {
					return Promise.resolve({
						worker: "worker3",
						a: ctx.params.a
					});
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
			//worker2.stop(),
			worker3.stop(),
		]));

		it("should retry unacked requests to other node", () => {
			return Promise.delay(2000).then(() => {
				return Promise.all([
					client.call("test.hello", { a: 1 }),
					client.call("test.hello", { a: 2 }),
					client.call("test.hello", { a: 3 }),
					client.call("test.hello", { a: 4 }),
					client.call("test.hello", { a: 5 }),
					client.call("test.hello", { a: 6 }),
				]).catch(protectReject).then(res => {
					//console.log(res);
					expect(res).toHaveLength(6);
					expect(worker2CB).toHaveBeenCalledTimes(1);
					expect(res.filter(o => o.worker == "worker1").length).toBeGreaterThan(0);
					expect(res.filter(o => o.worker == "worker3").length).toBeGreaterThan(0);
					// worker2 is crashed, so we didn't receive response from it.
					expect(res.filter(o => o.worker == "worker2")).toHaveLength(0);
					expect(res.map(o => o.a)).toEqual(expect.arrayContaining([1, 2, 3, 4, 5, 6]));
				});
			});
		}, 10000);
	});

});

const purgeList = {
	queues: [
		"MOL-test-rpc.REQ.rpc-client",
		"MOL-test-rpc.REQ.rpc-worker1",
		"MOL-test-rpc.REQ.rpc-worker2",
		"MOL-test-rpc.REQ.rpc-worker3",
		"MOL-test-rpc.REQB.$node.actions",
		"MOL-test-rpc.REQB.$node.events",
		"MOL-test-rpc.REQB.$node.health",
		"MOL-test-rpc.REQB.$node.list",
		"MOL-test-rpc.REQB.$node.services",
		"MOL-test-rpc.REQB.test.hello",
		"MOL-test-rpc.RES.rpc-client",
		"MOL-test-rpc.RES.rpc-worker1",
		"MOL-test-rpc.RES.rpc-worker2",
		"MOL-test-rpc.RES.rpc-worker3",
	],

	exchanges: [
		"MOL-test-rpc.DISCONNECT",
		"MOL-test-rpc.DISCOVER",
		"MOL-test-rpc.HEARTBEAT",
		"MOL-test-rpc.INFO",
		"MOL-test-rpc.PING",
	]
};
