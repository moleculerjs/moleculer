"use strict";

let LatencyStrategy = require("../../../src/strategies/latency");
let { extendExpect, protectReject } = require("../utils");
const ServiceBroker = require("../../../src/service-broker");
const Promise = require("bluebird");

const lolex = require("lolex");

extendExpect(expect);

describe("Test LatencyStrategy constructor", () => {

	it("should be the master", () => {

		const broker = new ServiceBroker({ nodeID: "node-1", transporter: "fake" });
		broker.localBus.listenerCount = jest.fn(() => 0);
		broker.localBus.on = jest.fn();

		let strategy = new LatencyStrategy({
			opts: {
				strategyOptions: {}
			}
		}, broker);

		expect(broker.localBus.on).toHaveBeenCalledTimes(7);
		expect(broker.localBus.on).toHaveBeenCalledWith("$broker.started", jasmine.any(Function));
		expect(broker.localBus.on).toHaveBeenCalledWith("$node.latencyMaster", jasmine.any(Function));
		expect(broker.localBus.on).toHaveBeenCalledWith("$node.latencySlave", jasmine.any(Function));
		expect(broker.localBus.on).toHaveBeenCalledWith("$node.pong", jasmine.any(Function));
		expect(broker.localBus.on).toHaveBeenCalledWith("$node.connected", jasmine.any(Function));
		expect(broker.localBus.on).toHaveBeenCalledWith("$node.disconnected", jasmine.any(Function));
		expect(broker.localBus.on).toHaveBeenCalledWith("$node.latencySlave", jasmine.any(Function));

		return broker.start().catch(protectReject).then(() => {
			expect(strategy.brokerStopped).toBe(false);
			expect(strategy.hostMap.size).toBe(0);
			expect(strategy.hostAvgLatency.size).toBe(0);

			return broker.stop();
		});
	});

	it("should be the slave", () => {

		const broker = new ServiceBroker({ nodeID: "node-1", transporter: "fake" });
		broker.localBus.listenerCount = jest.fn(() => 1);
		broker.localBus.on = jest.fn();

		let strategy = new LatencyStrategy({
			opts: {
				strategyOptions: {}
			}
		}, broker);

		expect(broker.localBus.on).toHaveBeenCalledTimes(2);
		expect(broker.localBus.on).toHaveBeenCalledWith("$node.latencySlave.removeHost", jasmine.any(Function));
		expect(broker.localBus.on).toHaveBeenCalledWith("$node.latencySlave", jasmine.any(Function));

		return broker.start().catch(protectReject).then(() => {
			expect(strategy.hostMap.size).toBe(0);
			expect(strategy.hostAvgLatency.size).toBe(0);

			return broker.stop();
		});
	});

	it("test without options & transporter", () => {

		const broker = new ServiceBroker();
		broker.localBus.on = jest.fn();

		let strategy = new LatencyStrategy({
			opts: {
				strategyOptions: {}
			}
		}, broker);

		expect(broker.localBus.on).toHaveBeenCalledTimes(0);

		expect(strategy.opts.pingInterval).toBe(10);
		expect(strategy.opts.sampleCount).toBe(5);
		expect(strategy.opts.lowLatency).toBe(10);
		expect(strategy.opts.collectCount).toBe(5);
	});

	it("test with options", () => {

		const broker = new ServiceBroker();

		let strategy = new LatencyStrategy({
			opts: {
				strategyOptions: {
					sampleCount: 15,
					lowLatency: 20,
					collectCount: 10,
					pingInterval: 15
				}
			}
		}, broker);

		expect(strategy.opts.pingInterval).toBe(15);
		expect(strategy.opts.sampleCount).toBe(15);
		expect(strategy.opts.lowLatency).toBe(20);
		expect(strategy.opts.collectCount).toBe(10);
	});
});

describe("Test LatencyStrategy.select method", () => {

	it("test without latency data (random)", () => {

		const broker = new ServiceBroker();

		let strategy = new LatencyStrategy({
			opts: {
				strategyOptions: {
					sampleCount: 5,
					lowLatency: 10,
					collectCount: 10,
					pingInterval: 1
				}
			}
		}, broker);

		const list = [
			{ a: "hello", node: { id: "a" } },
			{ b: "world", node: { id: "b" } },
			{ b: "now", node: { id: "c" } }
		];

		return broker.start().catch(protectReject).then(() => {
			expect(strategy.select(list)).toBeAnyOf(list);
			expect(strategy.select(list)).toBeAnyOf(list);
			expect(strategy.select(list)).toBeAnyOf(list);

			return broker.stop;
		});

	});

	it("test with latency data (where node has a low latency)", () => {

		const broker = new ServiceBroker();

		let strategy = new LatencyStrategy({
			opts: {
				strategyOptions: {
					sampleCount: 5,
					lowLatency: 10,
					collectCount: 10,
					pingInterval: 1
				}
			}
		}, broker);

		strategy.hostAvgLatency.set("a", 20);
		strategy.hostAvgLatency.set("b", 5);
		strategy.hostAvgLatency.set("c", 100);

		const list = [
			{ a: "hello", node: { hostname: "a" } },
			{ b: "world", node: { hostname: "b" } },
			{ b: "now", node: { hostname: "c" } }
		];

		expect(strategy.select(list)).toBe(list[1]);
		expect(strategy.select(list)).toBe(list[1]);
		expect(strategy.select(list)).toBe(list[1]);

	});

	it("test with latency data (where all nodes have some latency)", () => {

		const broker = new ServiceBroker();

		let strategy = new LatencyStrategy({
			opts: {
				strategyOptions: {
					sampleCount: 5,
					lowLatency: 10,
					collectCount: 10,
					pingInterval: 1
				}
			}
		}, broker);

		strategy.hostAvgLatency.set("a", 50);
		strategy.hostAvgLatency.set("b", 20);
		strategy.hostAvgLatency.set("c", 100);
		strategy.hostAvgLatency.set("d", 1000);

		const list = [
			{ a: "hello", node: { hostname: "a" } },
			{ b: "world", node: { hostname: "b" } },
			{ b: "now", node: { hostname: "c" } }
		];

		expect(strategy.select(list)).toBe(list[1]);
		expect(strategy.select(list)).toBe(list[1]);
		expect(strategy.select(list)).toBe(list[1]);

	});

	it("test with latency data (where all we have lots of nodes)", () => {

		const broker = new ServiceBroker();

		let strategy = new LatencyStrategy({
			opts: {
				strategyOptions: {
					sampleCount: 5,
					lowLatency: 10,
					collectCount: 10,
					pingInterval: 1
				}
			}
		}, broker);

		strategy.hostAvgLatency.set("a", 50);
		strategy.hostAvgLatency.set("b", 20);
		strategy.hostAvgLatency.set("c", 100);
		strategy.hostAvgLatency.set("d", 1000);

		const list = [
			{ a: "hello", node: { hostname: "a" } },
			{ b: "world", node: { hostname: "b" } },
			{ b: "12345", node: { hostname: "c" } },
			{ a: "olleh", node: { hostname: "a" } },
			{ b: "dlorw", node: { hostname: "b" } },
			{ b: "54321", node: { hostname: "c" } },
			{ a: "ooooo", node: { hostname: "a" } },
			{ b: "ppppp", node: { hostname: "b" } },
			{ b: "wwwww", node: { hostname: "c" } },
			{ a: "aaaaa", node: { hostname: "a" } },
			{ b: "bbbbb", node: { hostname: "b" } },
			{ b: "ccccc", node: { hostname: "c" } }
		];

		expect(strategy.select(list)).toBeAnyOf([list[1], list[4], list[7], list[10] ]);
		expect(strategy.select(list)).toBeAnyOf([list[1], list[4], list[7], list[10] ]);
		expect(strategy.select(list)).toBeAnyOf([list[1], list[4], list[7], list[10] ]);

	});
});

// TODO: add more unit tests to cover
// discovery, pingHosts, processPong, getHostLatency, addNode, removeHostMap,
// updateLatency, removeHostLatency methods

// TODO: make it better
describe.skip("Test LatencyStrategy #2", () => {
	let clock;

	beforeAll(() => {
		clock = lolex.install();
	});

	afterAll(() => {
		clock.uninstall();
	});

	it("test with three nodes", () => {
		let A = new ServiceBroker({
			nodeID: "node-A",
			transporter: "fake",
			registry: {
				strategy: "Latency",
				preferLocal: false,
				strategyOptions: {
					sampleCount: 5,
					lowLatency: 10,
					collectCount: 2,
					pingInterval: 1
				}
			}
		});

		A.createService({
			name: "Svc",
			actions: {
				echo(ctx) {
					return "A";
				}
			}
		});

		let B = new ServiceBroker({
			nodeID: "node-B",
			transporter: "fake",
			registry: {
				strategy: "Latency",
				preferLocal: false,
				strategyOptions: {
					sampleCount: 5,
					lowLatency: 10,
					collectCount: 2,
					pingInterval: 1
				}
			}
		});

		B.createService({
			name: "Svc",
			actions: {
				echo(ctx) {
					return "B";
				}
			}
		});

		let C = new ServiceBroker({
			nodeID: "node-C",
			transporter: "fake",
			registry: {
				strategy: "Latency",
				preferLocal: false,
				strategyOptions: {
					sampleCount: 5,
					lowLatency: 10,
					collectCount: 2,
					pingInterval: 1
				}
			}
		});

		C.createService({
			name: "Svc",
			actions: {
				echo(ctx) {
					return "C";
				}
			}
		});

		let caller = new ServiceBroker({
			nodeID: "node-caller",
			transporter: "fake",
			registry: {
				strategy: "Latency",
				preferLocal: false,
				strategyOptions: {
					sampleCount: 5,
					lowLatency: 10,
					collectCount: 2,
					pingInterval: 1
				}
			}
		});

		return Promise.all([
			A.start(),
			B.start(),
			C.start(),
			caller.start()
		])
			.then(function() {
				clock.tick(1500);
				return Promise.map(new Array(10), () => {
					return caller.call("Svc.echo").then((res) => {
						expect(["A", "B", "C"]).toContain(res);
					});
				});
			})
			.then(() => B.stop()).delay(1000)
			.then(function() {
				return Promise.map(new Array(10), () => {
					return caller.call("Svc.echo").then((res) => {
						expect(["A", "C"]).toContain(res);
					});
				});
			})
			.then(() => A.stop()).delay(1000)
			.then(function() {
				return Promise.map(new Array(10), () => {
					return caller.call("Svc.echo").then((res) => {
						expect(["C"]).toContain(res);
					});
				});
			})
			.then(() => {
				return Promise.all([
					C.stop(),
					caller.stop()
				]);
			})
			.catch(protectReject);
	});

});
