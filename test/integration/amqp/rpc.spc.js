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
		transporter: process.env.AMQP_URI || "amqp://guest:guest@localhost:5672",
		disableBalancer,
		registry: {
			preferLocal: false
		}
	});

	if (service)
		broker.createService(service);

	return broker;
}

// Build a super insecure worker.
// Calls to this kind of worker can change the response time and make nodes crash.
// Log entries are made for receiving a request, crashing, and responding to a request.
const createWorker = (number, disableBalancer, logs, options = {}) => {
	// We make a nodeRef object so that the crashing node can stop itself.
	const nodeRef = {
		broker: createNode(`worker${number}`, disableBalancer, {
			name: "test",
			actions: {
				hello({ params }) {
					const { delay = 0, crash = false } = params;

					logs.push({ type: "receive", worker: number, timestamp: Date.now(), params });

					if (options.canCrash && crash) {
						logs.push({ type: "crash", worker: number, timestamp: Date.now(), params });
						return nodeRef.broker.stop();
					}

					return Promise.delay(delay)
						.then(() => {
							const response = { type: "respond", worker: number, timestamp: Date.now(), params };
							logs.push(response);
							return response;
						});
				}
			}
		})
	};

	return nodeRef.broker;
};

// Wrap all test cases in a function so that they can be easily ran with and without balancing.
const runTestCases = (logs, client, worker1, worker2, worker3, builtInBalancer) => {

	// Simple function that we use everywhere
	const callShortDelay = () => client.call("test.hello", { delay: 20 });

	it("Only one node should receive any given request", () => {
		// Ensure that messages are not broadcast to individual queues.
		return callShortDelay()
			.catch(protectReject).then(() => {
				expect(logs).toHaveLength(2);
				expect(logs.filter(a => a.type === "receive")).toHaveLength(1);
				expect(logs.filter(a => a.type === "respond")).toHaveLength(1);
			});
	});

	it("Should load balance requests to available nodes.", () => {
		// Ensure that messages are evenly distributed
		return Promise.all(Array(12).fill().map(callShortDelay))
			.catch(protectReject).then(res => {
				expect(res).toHaveLength(12);

				expect(res).toEqual(expect.arrayContaining([
					expect.objectContaining({ worker: 1 }),
					expect.objectContaining({ worker: 2 }),
					expect.objectContaining({ worker: 3 }),
				]));

				expect(res.map(n => n.worker).sort()).toEqual([
					1,1,1,1,
					2,2,2,2,
					3,3,3,3
				]);
			});
	});

	it("Nodes should only receive one request at a time by default", () => {
		// Ensure that prefetch is working. This relies on message acking happening after the action
		// handler runs.
		return Promise.all([
			worker2.stop(),
			worker3.stop(),
		])
			.then(() => Promise.all(Array(3).fill().map(callShortDelay)))
			.catch(protectReject).then(res => {
				const getType = a => a.type;
				const getTime = a => a.timestamp;

				logs.forEach((cur, idx) => {
					// All requests should be handled by singe node
					expect(cur.worker).toEqual(1);

					// Order should go from old -> new
					if (logs[idx + 1] !== undefined) {
						expect(getTime(cur)).toBeLessThanOrEqual(getTime(logs[idx + 1]));
					}

					// If receive and respond don't alternate requests are concurrent
					expect(getType(cur)).toBe(idx % 2 === 0 ? "receive" : "respond");
				});
			});
	});

	// This test case doesn't work with built-in balancer
	if (!builtInBalancer) {

		it("Should use availability-based load balancing", () => {
			// Should allow consumers to pull messages as they can handle them.
			// This means that a single slow node won't slow down everything, or cause requests to be
			// processed out of order
			const callShortDelay = (_, i) => client.call("test.hello", { i: i + 1, delay: 20 });

			return Promise.all([
				client.call("test.hello", { i: 0, delay: 3000 }),
				...Array(8).fill().map(callShortDelay),
			]).catch(protectReject).then(res => {
				const slowWorker = logs.find(a => a.params.delay === 3000).worker;
				const otherWorker = logs.find(a => a.params.delay === 20).worker;

				expect(res).toHaveLength(9);

				expect(res).toEqual(expect.arrayContaining([
					expect.objectContaining({ worker: 1 }),
					expect.objectContaining({ worker: 2 }),
					expect.objectContaining({ worker: 3 }),
				]));

				// Slow worker should only have handled 1 request
				expect(res.filter(a => a.worker === slowWorker)).toHaveLength(1);

				// The other 2 workers should have handled 4
				expect(res.filter(a => a.worker === otherWorker)).toHaveLength(4);
			});
		});

		it("Messages that haven't finished processing should be retryable by other nodes.", () => {
			// This requires all requests to be made to a single queue.
			// This test also requires messages to be acked after the action handler finishes.
			// All broker's should consume from the same queue so that messages aren't abandoned in
			// node-specific queues, or tried out of order.
			const crashRequest = () => {
				return client.call("test.hello", { delay: 20, crash: true })
					.catch(err => ({ message: err.message, type: "error"}));
			};

			return Promise.all(Array(9).fill().map(crashRequest))
				.catch(protectReject).then((res) => {
					// The responses that failed initially won't show up in res, but the messages are still in
					// AMQP. If the messages are not ack'ed until processed, then another node will be able to
					// handle them instead.
					expect(logs.filter(a => a.type === "respond")).toHaveLength(9);

					// Check that crashing nodes actually crashed instead of responding
					expect(logs.filter(a => a.type === "crash" && a.worker === 2).length)
						.toBeGreaterThanOrEqual(1);
					expect(logs.filter(a => a.type === "crash" && a.worker === 3).length)
						.toBeGreaterThanOrEqual(1);
				});

		});

	}

};

describe("Test AMQPTransporter", () => {

	// Delete all queues and exchanges before and after suite
	beforeAll(() => purge(purgeList, true));
	afterAll(() => purge(purgeList, true));

	// Clear all queues between each test.
	afterEach(() => purge(purgeList));

	describe("Test AMQPTransporter RPC with built-in balancer", () => {

		const logs = [];

		const client = createNode("client", false);
		const worker1 = createWorker(1, false, logs);
		const worker2 = createWorker(2, false, logs, { canCrash: true });
		const worker3 = createWorker(3, false, logs, { canCrash: true });

		const brokers = [client, worker1, worker2, worker3];

		beforeEach(() => {
			return Promise.all(brokers.map(broker => broker.start())).delay(1000);
		});

		afterEach(() => {
			logs.length = 0;
			return Promise.all(brokers.map(broker => broker.stop())).delay(1000);
		});

		runTestCases(logs, client, worker1, worker2, worker3, true);

	});

	describe("Test AMQPTransporter RPC with DISABLED built-in balancer", () => {

		const logs = [];

		const client = createNode("client", true);
		const worker1 = createWorker(1, true, logs);
		const worker2 = createWorker(2, true, logs, { canCrash: true });
		const worker3 = createWorker(3, true, logs, { canCrash: true });

		const brokers = [client, worker1, worker2, worker3];

		beforeEach(() => Promise.all(brokers.map(broker => broker.start())).delay(1000));

		afterEach(() => {
			logs.length = 0;
			return Promise.all(brokers.map(broker => broker.stop()));
		});

		runTestCases(logs, client, worker1, worker2, worker3, false);

	});
});

const purgeList = {
	queues: [
		"MOL-test-rpc.DISCONNECT.rpc-client",
		"MOL-test-rpc.DISCONNECT.rpc-worker1",
		"MOL-test-rpc.DISCONNECT.rpc-worker2",
		"MOL-test-rpc.DISCONNECT.rpc-worker3",
		"MOL-test-rpc.DISCOVER.rpc-client",
		"MOL-test-rpc.DISCOVER.rpc-worker1",
		"MOL-test-rpc.DISCOVER.rpc-worker2",
		"MOL-test-rpc.DISCOVER.rpc-worker3",
		"MOL-test-rpc.EVENT.rpc-client",
		"MOL-test-rpc.EVENT.rpc-worker1",
		"MOL-test-rpc.EVENT.rpc-worker2",
		"MOL-test-rpc.EVENT.rpc-worker3",
		"MOL-test-rpc.HEARTBEAT.rpc-client",
		"MOL-test-rpc.HEARTBEAT.rpc-worker1",
		"MOL-test-rpc.HEARTBEAT.rpc-worker2",
		"MOL-test-rpc.HEARTBEAT.rpc-worker3",
		"MOL-test-rpc.INFO.rpc-client",
		"MOL-test-rpc.INFO.rpc-worker1",
		"MOL-test-rpc.INFO.rpc-worker2",
		"MOL-test-rpc.INFO.rpc-worker3",
		"MOL-test-rpc.PING.rpc-client",
		"MOL-test-rpc.PING.rpc-worker1",
		"MOL-test-rpc.PING.rpc-worker2",
		"MOL-test-rpc.PING.rpc-worker3",
		"MOL-test-rpc.PONG.rpc-client",
		"MOL-test-rpc.PONG.rpc-worker1",
		"MOL-test-rpc.PONG.rpc-worker2",
		"MOL-test-rpc.PONG.rpc-worker3",
		"MOL-test-rpc.REQ.$node.actions",
		"MOL-test-rpc.REQ.$node.health",
		"MOL-test-rpc.REQ.$node.list",
		"MOL-test-rpc.REQ.$node.services",
		"MOL-test-rpc.REQ.rpc-client",
		"MOL-test-rpc.REQ.rpc-worker1",
		"MOL-test-rpc.REQ.rpc-worker2",
		"MOL-test-rpc.REQ.rpc-worker3",
		"MOL-test-rpc.REQ.test.hello",
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
