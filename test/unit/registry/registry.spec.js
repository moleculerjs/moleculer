"use strict";

let Registry = require("../../../src/registry/registry");
let ServiceBroker = require("../../../src/service-broker");
let RoundRobinStrategy = require("../../../src/strategies").RoundRobin;

describe("Test Registry constructor", () => {

	let broker = new ServiceBroker();

	it("test properties", () => {
		let registry = new Registry(broker);

		expect(registry).toBeDefined();
		expect(registry.broker).toBe(broker);
		expect(registry.logger).toBeDefined();

		expect(registry.opts).toEqual({"circuitBreaker": {"enabled": false, "failureOnReject": true, "failureOnTimeout": true, "halfOpenTime": 10000, "maxFailures": 3}, "preferLocal": true});
		expect(registry.StrategyFactory).toBe(RoundRobinStrategy);
		expect(registry.nodes).toBeDefined();
		expect(registry.services).toBeDefined();
		expect(registry.actions).toBeDefined();
		expect(registry.events).toBeDefined();
	});

});

describe("Test Registry.registerLocalService", () => {

	let broker = new ServiceBroker();
	let registry = broker.registry;

	let service = {};

	registry.services.add = jest.fn(() => service);
	registry.registerActions = jest.fn();
	registry.registerEvents = jest.fn();

	it("should call register methods", () => {
		let svc = {
			name: "users",
			version: 2,
			settings: {},
			actions: {},
			events: []
		};

		registry.registerLocalService(svc);

		expect(registry.services.add).toHaveBeenCalledTimes(1);
		expect(registry.services.add).toHaveBeenCalledWith(registry.nodes.localNode, "users", 2, svc.settings);

		expect(registry.registerActions).toHaveBeenCalledTimes(1);
		expect(registry.registerActions).toHaveBeenCalledWith(registry.nodes.localNode, service, svc.actions);

		expect(registry.registerEvents).toHaveBeenCalledTimes(1);
		expect(registry.registerEvents).toHaveBeenCalledWith(registry.nodes.localNode, service, svc.events);
	});

	it("should not call register methods", () => {
		registry.services.add.mockClear();
		registry.registerActions.mockClear();
		registry.registerEvents.mockClear();

		let svc = {
			name: "users",
			version: 2,
			settings: {}
		};

		registry.registerLocalService(svc);

		expect(registry.services.add).toHaveBeenCalledTimes(1);
		expect(registry.services.add).toHaveBeenCalledWith(registry.nodes.localNode, "users", 2, svc.settings);

		expect(registry.registerActions).toHaveBeenCalledTimes(0);

		expect(registry.registerEvents).toHaveBeenCalledTimes(0);
	});
});
