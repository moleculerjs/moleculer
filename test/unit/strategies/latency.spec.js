"use strict";

const LatencyStrategy = require("../../../src/strategies/latency");
const { extendExpect, protectReject } = require("../utils");
const ServiceBroker = require("../../../src/service-broker");

const lolex = require("@sinonjs/fake-timers");

extendExpect(expect);

describe("Test LatencyStrategy constructor", () => {

	it("should be the master", () => {
		const callbacks = {};

		const broker = new ServiceBroker({ logger: false, nodeID: "node-1", transporter: "fake" });
		broker.localBus.listenerCount = jest.fn(() => 0);
		broker.localBus.on = jest.fn((name, fn) => callbacks[name] = fn);

		let strategy = new LatencyStrategy(broker.registry, broker);

		expect(broker.localBus.on).toHaveBeenCalledTimes(7);
		expect(broker.localBus.on).toHaveBeenCalledWith("$broker.started", expect.any(Function));
		expect(broker.localBus.on).toHaveBeenCalledWith("$node.latencyMaster", expect.any(Function));
		expect(broker.localBus.on).toHaveBeenCalledWith("$node.latencySlave", expect.any(Function));
		expect(broker.localBus.on).toHaveBeenCalledWith("$node.pong", expect.any(Function));
		expect(broker.localBus.on).toHaveBeenCalledWith("$node.connected", expect.any(Function));
		expect(broker.localBus.on).toHaveBeenCalledWith("$node.disconnected", expect.any(Function));
		expect(broker.localBus.on).toHaveBeenCalledWith("$node.latencySlave", expect.any(Function));

		// Test callbacks
		/* Can't work due to bindings
		strategy.processPong = jest.fn();
		strategy.addNode = jest.fn();
		strategy.removeHostMap = jest.fn();
		strategy.discovery = jest.fn();
		strategy.updateLatency = jest.fn();

		callbacks["$node.pong"]();
		expect(strategy.processPong).toHaveBeenCalledTimes(1);*/

		return broker.start().catch(protectReject).then(() => {
			expect(strategy.brokerStopped).toBe(false);
			expect(strategy.hostMap.size).toBe(0);
			expect(strategy.hostAvgLatency.size).toBe(0);

			return broker.stop();
		});
	});

	it("should be the slave", () => {

		const broker = new ServiceBroker({ logger: false, nodeID: "node-1", transporter: "fake" });
		broker.localBus.listenerCount = jest.fn(() => 1);
		broker.localBus.on = jest.fn();

		let strategy = new LatencyStrategy(broker.registry, broker, {});

		expect(broker.localBus.on).toHaveBeenCalledTimes(2);
		expect(broker.localBus.on).toHaveBeenCalledWith("$node.latencySlave.removeHost", expect.any(Function));
		expect(broker.localBus.on).toHaveBeenCalledWith("$node.latencySlave", expect.any(Function));

		return broker.start().catch(protectReject).then(() => {
			expect(strategy.hostMap.size).toBe(0);
			expect(strategy.hostAvgLatency.size).toBe(0);

			return broker.stop();
		});
	});

	it("test without options & transporter", () => {

		const broker = new ServiceBroker({ logger: false });
		broker.localBus.on = jest.fn();

		let strategy = new LatencyStrategy(broker.registry, broker, {});

		expect(broker.localBus.on).toHaveBeenCalledTimes(0);

		expect(strategy.opts.pingInterval).toBe(10);
		expect(strategy.opts.sampleCount).toBe(5);
		expect(strategy.opts.lowLatency).toBe(10);
		expect(strategy.opts.collectCount).toBe(5);
	});

	it("test with options", () => {

		const broker = new ServiceBroker({ logger: false });

		let strategy = new LatencyStrategy(broker.registry, broker, {
			sampleCount: 15,
			lowLatency: 20,
			collectCount: 10,
			pingInterval: 15
		});

		expect(strategy.opts.pingInterval).toBe(15);
		expect(strategy.opts.sampleCount).toBe(15);
		expect(strategy.opts.lowLatency).toBe(20);
		expect(strategy.opts.collectCount).toBe(10);
	});
});

describe("Test LatencyStrategy.discovery method", () => {
	let clock;

	beforeAll(() => clock = lolex.install());
	afterAll(() => clock.uninstall());

	it("should call sendPing in transit", () => {
		const broker = new ServiceBroker({ logger: false, transporter: "Fake" });

		let strategy = new LatencyStrategy(broker.registry, broker, {
			sampleCount: 15,
			lowLatency: 20,
			collectCount: 10,
			pingInterval: 15
		});

		strategy.pingHosts = jest.fn();
		broker.transit.sendPing = jest.fn(() => Promise.resolve());

		return strategy.discovery().catch(protectReject).then(() => {

			expect(broker.transit.sendPing).toHaveBeenCalledTimes(1);
			expect(broker.transit.sendPing).toHaveBeenCalledWith();

			expect(strategy.pingHosts).toHaveBeenCalledTimes(0);

			clock.tick(15500);

			expect(strategy.pingHosts).toHaveBeenCalledTimes(1);
		});
	});
});

describe("Test LatencyStrategy.pingHosts method", () => {
	let clock;

	beforeAll(() => clock = lolex.install());
	afterAll(() => clock.uninstall());

	it("should call sendPing in transit", () => {
		const broker = new ServiceBroker({ logger: false, transporter: "Fake" });

		let strategy = new LatencyStrategy(broker.registry, broker, {
			sampleCount: 15,
			lowLatency: 20,
			collectCount: 10,
			pingInterval: 15
		});

		strategy.hostMap.set("host-a", {
			nodeList: ["node-a1", "node-a2", "node-a3"]
		});
		strategy.hostMap.set("host-b", {
			nodeList: ["node-b1", "node-b2", "node-b3"]
		});

		broker.transit.sendPing = jest.fn(() => Promise.resolve());

		return strategy.pingHosts().catch(protectReject).then(() => {

			expect(broker.transit.sendPing).toHaveBeenCalledTimes(2);
			expect(broker.transit.sendPing.mock.calls[0][0]).toBeAnyOf(["node-a1", "node-a2", "node-a3"]);
			expect(broker.transit.sendPing.mock.calls[1][0]).toBeAnyOf(["node-b1", "node-b2", "node-b3"]);

			strategy.pingHosts = jest.fn(() => Promise.resolve());
			clock.tick(15500);

			expect(strategy.pingHosts).toHaveBeenCalledTimes(1);
		});
	});
});

describe("Test LatencyStrategy.processPong method", () => {
	const broker = new ServiceBroker({ logger: false });
	const strategy = new LatencyStrategy(broker.registry, broker);

	it("should calc avg latency and send to slaves", () => {
		broker.localBus.emit = jest.fn();
		const mockNode = {
			id: "node-a1",
			hostname: "host-a"
		};
		strategy.registry.nodes.get = jest.fn(() => mockNode);

		const historicLatency = [20, 40, 180, 10];
		strategy.getHostLatency = jest.fn(() => ({ historicLatency }));

		strategy.processPong({ nodeID: "node-a1", elapsedTime: 30 });

		expect(strategy.registry.nodes.get).toHaveBeenCalledTimes(1);
		expect(strategy.registry.nodes.get).toHaveBeenCalledWith("node-a1");

		expect(strategy.getHostLatency).toHaveBeenCalledTimes(1);
		expect(strategy.getHostLatency).toHaveBeenCalledWith(mockNode);

		expect(broker.localBus.emit).toHaveBeenCalledTimes(1);
		expect(broker.localBus.emit).toHaveBeenCalledWith("$node.latencySlave", {
			avgLatency: 56,
			hostname: "host-a"
		});

		// Test collection shifting
		expect(historicLatency.length).toBe(5);
		strategy.processPong({ nodeID: "node-a1", elapsedTime: 25 });
		expect(historicLatency.length).toBe(5);
	});
});

describe("Test LatencyStrategy.getHostLatency method", () => {
	const broker = new ServiceBroker({ logger: false });
	const strategy = new LatencyStrategy(broker.registry, broker);

	it("should create new info item", () => {
		expect(strategy.hostMap.size).toBe(0);

		const res = strategy.getHostLatency({
			id: "node-1",
			hostname: "host-a"
		});

		expect(res).toEqual({
			historicLatency: [],
			nodeList: ["node-1"]
		});
		expect(strategy.hostMap.size).toBe(1);
	});

	it("should return info by nodeID", () => {
		const res = strategy.getHostLatency({
			id: "node-2",
			hostname: "host-a"
		});

		expect(res).toEqual({
			historicLatency: [],
			nodeList: ["node-1"]
		});
		expect(strategy.hostMap.size).toBe(1);
	});

	it("should append nodeID", () => {
		strategy.addNode({
			node: {
				id: "node-2",
				hostname: "host-a"
			}
		});

		const res = strategy.getHostLatency({
			id: "node-2",
			hostname: "host-a"
		});

		expect(res).toEqual({
			historicLatency: [],
			nodeList: ["node-1", "node-2"]
		});
		expect(strategy.hostMap.size).toBe(1);
	});

	it("should not append nodeID", () => {
		strategy.addNode({
			node: {
				id: "node-2",
				hostname: "host-a"
			}
		});

		const res = strategy.getHostLatency({
			id: "node-2",
			hostname: "host-a"
		});

		expect(res).toEqual({
			historicLatency: [],
			nodeList: ["node-1", "node-2"]
		});
		expect(strategy.hostMap.size).toBe(1);
	});
});

describe("Test LatencyStrategy.removeHostMap method", () => {
	const broker = new ServiceBroker({ logger: false });
	const strategy = new LatencyStrategy(broker.registry, broker);

	broker.localBus.emit = jest.fn();

	it("should not remove nodeID", () => {
		strategy.hostMap.set("host-a", {
			nodeList: ["node-1", "node-2"]
		});

		strategy.removeHostMap({ node: {
			hostname: "host-b",
			id: "node-3"
		} });

		expect(strategy.hostMap.get("host-a")).toEqual({
			nodeList: ["node-1", "node-2"]
		});

		expect(broker.localBus.emit).toHaveBeenCalledTimes(0);
	});

	it("should remove 'node-1'", () => {
		strategy.removeHostMap({ node: {
			hostname: "host-a",
			id: "node-1"
		} });

		expect(strategy.hostMap.get("host-a")).toEqual({
			nodeList: ["node-2"]
		});

		expect(broker.localBus.emit).toHaveBeenCalledTimes(0);
	});

	it("should remove 'node-2' & emit event", () => {
		strategy.removeHostMap({ node: {
			hostname: "host-a",
			id: "node-2"
		} });

		expect(strategy.hostMap.get("host-a")).toBeUndefined();

		expect(broker.localBus.emit).toHaveBeenCalledTimes(1);
		expect(broker.localBus.emit).toHaveBeenCalledWith("$node.latencySlave.removeHost", "host-a");
	});

});

describe("Test LatencyStrategy.updateLatency & removeHostLatency method", () => {
	const broker = new ServiceBroker({ logger: false });
	const strategy = new LatencyStrategy(broker.registry, broker);

	it("should set latency data", () => {
		expect(strategy.hostAvgLatency.get("host-a")).toBeUndefined();

		strategy.updateLatency({ hostname: "host-a", avgLatency: 100 });
		expect(strategy.hostAvgLatency.get("host-a")).toBe(100);

		strategy.updateLatency({ hostname: "host-b", avgLatency: 50 });
		expect(strategy.hostAvgLatency.get("host-b")).toBe(50);

		strategy.updateLatency({ hostname: "host-a", avgLatency: 20 });
		expect(strategy.hostAvgLatency.get("host-a")).toBe(20);
	});

	it("should remove latency data", () => {
		strategy.removeHostLatency("host-a");
		expect(strategy.hostAvgLatency.get("host-a")).toBeUndefined();
		expect(strategy.hostAvgLatency.get("host-b")).toBe(50);
	});
});

describe("Test LatencyStrategy.select method", () => {

	it("test without latency data (random)", () => {

		const broker = new ServiceBroker({ logger: false });

		let strategy = new LatencyStrategy(broker.registry, broker, {
			sampleCount: 5,
			lowLatency: 10,
			collectCount: 10,
			pingInterval: 1
		});

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

		const broker = new ServiceBroker({ logger: false });

		let strategy = new LatencyStrategy(broker.registry, broker, {
			sampleCount: 5,
			lowLatency: 10,
			collectCount: 10,
			pingInterval: 1
		});

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

		const broker = new ServiceBroker({ logger: false });

		let strategy = new LatencyStrategy(broker.registry, broker, {
			sampleCount: 5,
			lowLatency: 10,
			collectCount: 10,
			pingInterval: 1
		});

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

		const broker = new ServiceBroker({ logger: false });

		let strategy = new LatencyStrategy(broker.registry, broker, {
			sampleCount: 15,
			lowLatency: 10,
			collectCount: 10,
			pingInterval: 1
		});

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
