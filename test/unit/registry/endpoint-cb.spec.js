"use strict";

const lolex = require("lolex");
let ActionEndpointCB = require("../../../src/registry/endpoint-cb");
let ServiceBroker = require("../../../src/service-broker");
let { RequestTimeoutError, MoleculerError } = require("../../../src/errors");
const { CIRCUIT_CLOSE, CIRCUIT_HALF_OPEN, CIRCUIT_OPEN } = require("../../../src/constants");

describe("Test ActionEndpoint", () => {

	let broker = new ServiceBroker();
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

		expect(ep.opts).toBe(registry.opts.circuitBreaker);
		expect(ep.state).toBe(CIRCUIT_CLOSE);
		expect(ep.failures).toBe(0);
		expect(ep.cbTimer).toBeNull();

		expect(ep.isAvailable).toBe(true);
	});
});

describe("Test ActionEndpoint circuit-breaker", () => {

	let broker = new ServiceBroker({
		circuitBreaker: {
			maxFailures: 2,
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

		ep.state = CIRCUIT_OPEN;
		expect(ep.isAvailable).toBe(false);

		ep.state = CIRCUIT_CLOSE;
		expect(ep.isAvailable).toBe(true);
	});

	it("test failure", () => {
		ep.circuitOpen = jest.fn();

		expect(ep.failures).toBe(0);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.failure();
		expect(ep.failures).toBe(0);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.failure(new RequestTimeoutError());
		expect(ep.failures).toBe(1);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.opts.failureOnTimeout = false;
		ep.failure(new RequestTimeoutError());
		expect(ep.failures).toBe(1);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.failure(new MoleculerError("Client error", 404));
		expect(ep.failures).toBe(1);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.opts.failureOnReject = false;
		ep.failure(new MoleculerError("Server error"));
		expect(ep.failures).toBe(1);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(0);

		ep.opts.failureOnReject = true;
		ep.failure(new MoleculerError("Server error"));
		expect(ep.failures).toBe(2);
		expect(ep.circuitOpen).toHaveBeenCalledTimes(1);
	});

	it("test circuitOpen", () => {
		const clock = lolex.install();

		ep.state = CIRCUIT_CLOSE;
		ep.circuitHalfOpen = jest.fn();

		ep.circuitOpen();

		expect(ep.state).toBe(CIRCUIT_OPEN);
		expect(ep.isAvailable).toBe(false);
		expect(ep.cbTimer).toBeDefined();
		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$circuit-breaker.opened", { node, action, failures: 0 });
		expect(broker.emit).toHaveBeenCalledTimes(1);
		expect(broker.emit).toHaveBeenCalledWith("metrics.circuit-breaker.opened", { nodeID: "server-1", action: "user.list", failures: 0 });

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
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$circuit-breaker.half-opened", { node, action });
		expect(broker.emit).toHaveBeenCalledTimes(1);
		expect(broker.emit).toHaveBeenCalledWith("metrics.circuit-breaker.half-opened", { nodeID: "server-1", action: "user.list" });

	});

	it("test circuitOpen", () => {
		broker.broadcastLocal.mockClear();
		broker.emit.mockClear();

		ep.state = CIRCUIT_HALF_OPEN;
		ep.failures = 5;

		ep.success();

		expect(ep.state).toBe(CIRCUIT_CLOSE);
		expect(ep.failures).toBe(0);
		expect(ep.isAvailable).toBe(true);
		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$circuit-breaker.closed", { node, action });
		expect(broker.emit).toHaveBeenCalledTimes(1);
		expect(broker.emit).toHaveBeenCalledWith("metrics.circuit-breaker.closed", { nodeID: "server-1", action: "user.list" });

	});

});
