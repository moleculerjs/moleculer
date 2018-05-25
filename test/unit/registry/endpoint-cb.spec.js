"use strict";

const lolex = require("lolex");
let ActionEndpointCB = require("../../../src/registry/endpoint-cb");
let ServiceBroker = require("../../../src/service-broker");
let { RequestTimeoutError, MoleculerError } = require("../../../src/errors");
const { CIRCUIT_CLOSE, CIRCUIT_HALF_OPEN, CIRCUIT_HALF_OPEN_WAIT, CIRCUIT_OPEN } = require("../../../src/constants");

describe("Test ActionEndpoint", () => {

	let broker = new ServiceBroker({ logger: false });
	let registry = broker.registry;

	let node = { id: "server-1" };
	let service = { name: "test" };
	let action = { name: "test.hello" };
	let ep;

	broker.broadcastLocal = jest.fn();

	it("should set properties", () => {
		ep = new ActionEndpointCB(registry, broker, node, service, action);

		expect(ep).toBeDefined();
		expect(ep.registry).toBe(registry);
		expect(ep.broker).toBe(broker);
		expect(ep.node).toBe(node);
		expect(ep.service).toBe(service);
		expect(ep.action).toBe(action);

		expect(ep.opts).toEqual({
			"enabled": false,
			"halfOpenTime": 10000,
			"minRequestCount": 20,
			"threshold": 0.5,
			"windowTime": 60,
			check: jasmine.any(Function),
		});
		expect(ep.state).toBe(CIRCUIT_CLOSE);
		expect(ep.failures).toBe(0);
		expect(ep.reqCount).toBe(0);
		expect(ep.cbTimer).toBeNull();
		expect(ep.windowTimer).toBeDefined();

		expect(ep.isAvailable).toBe(true);
	});
});

describe("Test ActionEndpoint circuit-breaker", () => {

	let broker = new ServiceBroker({
		logger: false,
		circuitBreaker: {
			threshold: 0.5,
			minRequestCount: 2,
			halfOpenTime: 5 * 1000
		},
		metrics: true
	});
	let registry = broker.registry;

	let node = { id: "server-1" };
	let service = { name: "user" };
	let action = { name: "user.list", handler: jest.fn() };
	let ep;

	broker.broadcastLocal = jest.fn();
	broker.emit = jest.fn();

	beforeEach(() => {
		ep = new ActionEndpointCB(registry, broker, node, service, action);
	});
	it("test available", () => {
		ep.state = CIRCUIT_HALF_OPEN;
		expect(ep.isAvailable).toBe(true);

		ep.state = CIRCUIT_HALF_OPEN_WAIT;
		expect(ep.isAvailable).toBe(false);

		ep.state = CIRCUIT_OPEN;
		expect(ep.isAvailable).toBe(false);

		ep.state = CIRCUIT_CLOSE;
		expect(ep.isAvailable).toBe(true);
	});

	it("test reqCount", () => {
		expect(ep.reqCount).toBe(0);

		ep.success();
		expect(ep.reqCount).toBe(1);

		ep.success();
		expect(ep.reqCount).toBe(2);

		ep.failure();
		expect(ep.reqCount).toBe(3);
	});

	it("test failure", () => {
		ep.opts.minRequestCount = 5;
		ep.circuitOpen = jest.fn();

		expect(ep.failures).toBe(0);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.failure(new RequestTimeoutError({}));
		expect(ep.failures).toBe(1);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.failure(new MoleculerError("Client error", 404));
		expect(ep.failures).toBe(2);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);
	});

	it("test failure min request count", () => {
		ep.opts.minRequestCount = 5;
		ep.opts.failureOnReject = true;

		ep.circuitOpen = jest.fn();

		expect(ep.failures).toBe(0);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.failure(new MoleculerError());
		expect(ep.failures).toBe(1);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.failure(new MoleculerError());
		expect(ep.failures).toBe(2);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.failure(new MoleculerError());
		expect(ep.failures).toBe(3);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.failure(new MoleculerError());
		expect(ep.failures).toBe(4);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.failure(new MoleculerError());
		expect(ep.failures).toBe(5);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(1);
	});

	it("test failure threshold", () => {
		ep.opts.minRequestCount = 5;
		ep.opts.threshold = 0.3;
		ep.opts.failureOnReject = true;

		ep.circuitOpen = jest.fn();

		expect(ep.reqCount).toBe(0);
		expect(ep.failures).toBe(0);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.failure(new MoleculerError());
		expect(ep.reqCount).toBe(1);
		expect(ep.failures).toBe(1);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.failure(new MoleculerError());
		expect(ep.reqCount).toBe(2);
		expect(ep.failures).toBe(2);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.success();
		expect(ep.reqCount).toBe(3);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.success();
		expect(ep.reqCount).toBe(4);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.success();
		expect(ep.reqCount).toBe(5);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(1);
	});

	it("test window reset", () => {
		const clock = lolex.install();

		const ep = new ActionEndpointCB(registry, broker, node, service, action);
		ep.opts.minRequestCount = 5;
		ep.opts.threshold = 0.5;
		ep.opts.failureOnReject = true;

		ep.circuitOpen = jest.fn();

		expect(ep.failures).toBe(0);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.failure(new MoleculerError());
		expect(ep.failures).toBe(1);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.failure(new MoleculerError());
		expect(ep.failures).toBe(2);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.failure(new MoleculerError());
		expect(ep.failures).toBe(3);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		clock.tick(62 * 1000);
		expect(ep.failures).toBe(0);
		expect(ep.reqCount).toBe(0);

		ep.failure(new MoleculerError());
		expect(ep.failures).toBe(1);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.failure(new MoleculerError());
		expect(ep.failures).toBe(2);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.failure(new MoleculerError());
		expect(ep.failures).toBe(3);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.failure(new MoleculerError());
		expect(ep.failures).toBe(4);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.failure(new MoleculerError());
		expect(ep.failures).toBe(5);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(1);

		clock.uninstall();
	});

	it("test circuitOpen", () => {
		const clock = lolex.install();

		ep.state = CIRCUIT_CLOSE;
		ep.circuitHalfOpen = jest.fn();

		ep.failures = 3;
		ep.reqCount = 6;

		ep.circuitOpen();

		expect(ep.state).toBe(CIRCUIT_OPEN);
		expect(ep.isAvailable).toBe(false);
		expect(ep.cbTimer).toBeDefined();
		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$circuit-breaker.opened", { nodeID: "server-1", action: "user.list", failures: 3, reqCount: 6, rate: 0.5 });
		expect(broker.emit).toHaveBeenCalledTimes(1);
		expect(broker.emit).toHaveBeenCalledWith("metrics.circuit-breaker.opened", { nodeID: "server-1", action: "user.list", failures: 3, reqCount: 6, rate: 0.5 });

		// circuitHalfOpen
		expect(ep.circuitHalfOpen).toHaveBeenCalledTimes(0);

		clock.tick(6 * 1000);

		expect(ep.circuitHalfOpen).toHaveBeenCalledTimes(1);

		clock.uninstall();
	});

	it("test circuitOpen", () => {
		broker.broadcastLocal.mockClear();
		broker.emit.mockClear();

		ep.state = CIRCUIT_OPEN;
		ep.circuitHalfOpen();

		expect(ep.state).toBe(CIRCUIT_HALF_OPEN);
		expect(ep.isAvailable).toBe(true);
		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$circuit-breaker.half-opened", { nodeID: "server-1", action: "user.list" });
		expect(broker.emit).toHaveBeenCalledTimes(1);
		expect(broker.emit).toHaveBeenCalledWith("metrics.circuit-breaker.half-opened", { nodeID: "server-1", action: "user.list" });

	});

	it("test circuitClose", () => {
		broker.broadcastLocal.mockClear();
		broker.emit.mockClear();

		ep.state = CIRCUIT_HALF_OPEN_WAIT;
		ep.failures = 5;

		ep.success();

		expect(ep.state).toBe(CIRCUIT_CLOSE);
		expect(ep.failures).toBe(0);
		expect(ep.reqCount).toBe(1);
		expect(ep.isAvailable).toBe(true);
		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$circuit-breaker.closed", { nodeID: "server-1", action: "user.list" });
		expect(broker.emit).toHaveBeenCalledTimes(1);
		expect(broker.emit).toHaveBeenCalledWith("metrics.circuit-breaker.closed", { nodeID: "server-1", action: "user.list" });

	});

});
