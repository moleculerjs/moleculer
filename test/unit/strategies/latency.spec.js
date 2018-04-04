"use strict";

let LatencyStrategy = require("../../../src/strategies/latency");
let { extendExpect } = require("../utils");
const ServiceBroker = require("../../../src/service-broker");
const Promise = require("bluebird");

extendExpect(expect);

describe("Test LatencyStrategy", () => {

	it("should have properties", () => {

		const brokerWithTransit = new ServiceBroker({ nodeID: "node-1", transporter: "fake" });

		let strategy = new LatencyStrategy({
			opts: {
				strategyOptions: {}
			}
		}, brokerWithTransit);

		expect(brokerWithTransit.localBus.listenerCount("$broker.started")).toBe(2);
		expect(brokerWithTransit.localBus.listenerCount("$node.latencyMaster")).toBe(1);
		expect(brokerWithTransit.localBus.listenerCount("$node.latencySlave")).toBe(1);
		expect(brokerWithTransit.localBus.listenerCount("$node.pong")).toBe(1);
		expect(brokerWithTransit.localBus.listenerCount("$node.connected")).toBe(1);
		expect(brokerWithTransit.localBus.listenerCount("$node.disconnected")).toBe(1);

		return brokerWithTransit.start().then(() => {
			expect(strategy.hostMap.size).toBe(0);
			expect(strategy.hostLatency.size).toBe(0);
		}).then(() => {
			return brokerWithTransit.stop();
		});
	});

	it("test without options", () => {

		const brokerWithNoTransit = new ServiceBroker();

		let strategy = new LatencyStrategy({
			opts: {
				strategyOptions: {}
			}
		}, brokerWithNoTransit);

		expect(strategy.opts.pingInterval).toBe(10);
		expect(strategy.opts.sampleCount).toBe(5);
		expect(strategy.opts.lowLatency).toBe(10);
		expect(strategy.opts.collectCount).toBe(5);
	});

	it("test with options", () => {

		const brokerWithNoTransit = new ServiceBroker();

		let strategy = new LatencyStrategy({
			opts: {
				strategyOptions: {
		            sampleCount: 15,
		            lowLatency: 20,
		            collectCount: 10,
		            pingInterval: 15
				}
			}
		}, brokerWithNoTransit);

		expect(strategy.opts.pingInterval).toBe(15);
		expect(strategy.opts.sampleCount).toBe(15);
		expect(strategy.opts.lowLatency).toBe(20);
		expect(strategy.opts.collectCount).toBe(10);
	});

	it("test without latency data", () => {

		const brokerWithNoTransit = new ServiceBroker();

		let strategy = new LatencyStrategy({
			opts: {
				strategyOptions: {
					sampleCount: 5,
		            lowLatency: 10,
		            collectCount: 10,
		            pingInterval: 1
				}
			}
		}, brokerWithNoTransit);

		const list = [
			{ a: "hello", node: { id: 'a' } },
			{ b: "world", node: { id: 'b' } },
			{ b: "now", node: { id: 'c' } }
		];

		return brokerWithNoTransit.start().then(() => {
			expect(strategy.select(list)).toBeAnyOf(list);
			expect(strategy.select(list)).toBeAnyOf(list);
			expect(strategy.select(list)).toBeAnyOf(list);
		});

	});

	it("test with latency data (where node has a low latency)", () => {

		const brokerWithNoTransit = new ServiceBroker();

		let strategy = new LatencyStrategy({
			opts: {
				strategyOptions: {
					sampleCount: 5,
		            lowLatency: 10,
		            collectCount: 10,
		            pingInterval: 1
				}
			}
		}, brokerWithNoTransit);

		strategy.hostLatency.set("a", 5);
		strategy.hostLatency.set("b", 20);
		strategy.hostLatency.set("c", 100);

		const list = [
			{ a: "hello", node: { hostname: "a" } },
			{ b: "world", node: { hostname: 'b' } },
			{ b: "now", node: { hostname: "c" } }
		];

		expect(strategy.select(list)).toBe(list[0]);
		expect(strategy.select(list)).toBe(list[0]);
		expect(strategy.select(list)).toBe(list[0]);

	});

	it("test with latency data (where all nodes have some latency)", () => {

		const brokerWithNoTransit = new ServiceBroker();

		let strategy = new LatencyStrategy({
			opts: {
				strategyOptions: {
					sampleCount: 5,
		            lowLatency: 10,
		            collectCount: 10,
		            pingInterval: 1
				}
			}
		}, brokerWithNoTransit);

		strategy.hostLatency.set("a", 50);
		strategy.hostLatency.set("b", 20);
		strategy.hostLatency.set("c", 100);
		strategy.hostLatency.set("d", 1000);

		const list = [
			{ a: "hello", node: { hostname: "a" } },
			{ b: "world", node: { hostname: 'b' } },
			{ b: "now", node: { hostname: "c" } }
		];

		expect(strategy.select(list)).toBe(list[1]);
		expect(strategy.select(list)).toBe(list[1]);
		expect(strategy.select(list)).toBe(list[1]);

	});

	it("test with latency data (where all we have lots of nodes)", () => {

		const brokerWithNoTransit = new ServiceBroker();

		let strategy = new LatencyStrategy({
			opts: {
				strategyOptions: {
					sampleCount: 5,
		            lowLatency: 10,
		            collectCount: 10,
		            pingInterval: 1
				}
			}
		}, brokerWithNoTransit);

		strategy.hostLatency.set("a", 50);
		strategy.hostLatency.set("b", 20);
		strategy.hostLatency.set("c", 100);
		strategy.hostLatency.set("d", 1000);

		const list = [
			{ a: "hello", node: { hostname: "a" } },
			{ b: "world", node: { hostname: 'b' } },
			{ b: "12345", node: { hostname: "c" } },
			{ a: "olleh", node: { hostname: "a" } },
			{ b: "dlorw", node: { hostname: 'b' } },
			{ b: "54321", node: { hostname: "c" } },
			{ a: "ooooo", node: { hostname: "a" } },
			{ b: "ppppp", node: { hostname: 'b' } },
			{ b: "wwwww", node: { hostname: "c" } },
			{ a: "aaaaa", node: { hostname: "a" } },
			{ b: "bbbbb", node: { hostname: 'b' } },
			{ b: "ccccc", node: { hostname: "c" } }
		];

		expect(strategy.select(list)).toBeAnyOf(list);
		expect(strategy.select(list)).toBeAnyOf(list);
		expect(strategy.select(list)).toBeAnyOf(list);

	});

	it("test with three nodes", () => {
		let A = new ServiceBroker({
			nodeID: "node-A",
			transporter: "fake",
			registry: {
		        strategy: 'Latency',
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
			name: 'Svc',
			actions: {
				echo: function(ctx) {
					return "A";
				}
			}
		});

		let B = new ServiceBroker({
			nodeID: "node-B",
			transporter: "fake",
			registry: {
		        strategy: 'Latency',
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
			name: 'Svc',
			actions: {
				echo: function(ctx) {
					return "B";
				}
			}
		});

		let C = new ServiceBroker({
			nodeID: "node-C",
			transporter: "fake",
			registry: {
		        strategy: 'Latency',
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
			name: 'Svc',
			actions: {
				echo: function(ctx) {
					return "C";
				}
			}
		});

		let caller = new ServiceBroker({
			nodeID: "node-caller",
			transporter: "fake",
			registry: {
				strategy: 'Latency',
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
			A.start().delay(500),
			B.start().delay(500),
			C.start().delay(500),
			caller.start().delay(500)
		])
		.delay(1000)
		.then(function() {
			return Promise.map(new Array(10), () => {
				return caller.call('Svc.echo').then((res) => {
					expect(["A", "B", "C"]).toContain(res);
				});
			})
		})
		.then(() => B.stop()).delay(1000)
		.then(function() {
			return Promise.map(new Array(10), () => {
				return caller.call('Svc.echo').then((res) => {
					expect(["A", "C"]).toContain(res);
				});
			})
		})
		.then(() => A.stop()).delay(1000)
		.then(function() {
			return Promise.map(new Array(10), () => {
				return caller.call('Svc.echo').then((res) => {
					expect(["C"]).toContain(res);
				});
			})
		})
		.then(() => {
			return Promise.all([
				C.stop(),
				caller.stop()
			])
		})
	});

});
