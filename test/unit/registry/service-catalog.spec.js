"use strict";

let ServiceCatalog = require("../../../src/registry/service-catalog");
let ServiceItem = require("../../../src/registry/service-item");
let ServiceBroker = require("../../../src/service-broker");

describe("Test ServiceCatalog constructor", () => {

	let broker = new ServiceBroker();
	let registry = broker.registry;

	it("test without CB", () => {
		let catalog = new ServiceCatalog(registry, broker);

		expect(catalog).toBeDefined();
		expect(catalog.registry).toBe(registry);
		expect(catalog.broker).toBe(broker);
		expect(catalog.logger).toBe(registry.logger);
		expect(catalog.services).toBeInstanceOf(Array);
	});

});

describe("Test ServiceCatalog methods", () => {
	let broker = new ServiceBroker();
	let catalog = new ServiceCatalog(broker.registry, broker);

	it("should create a ServiceItem and add to 'events'", () => {
		let node = { id: "server-1" };

		expect(catalog.services.length).toBe(0);

		let svc = catalog.add(node, "test", undefined, { a: 5 });

		expect(catalog.services.length).toBe(1);
		expect(svc).toBeInstanceOf(ServiceItem);
	});

	it("should be find the service", () => {
		expect(catalog.has("test", undefined, "server-2")).toBe(false);
		expect(catalog.has("test", undefined, "server-1")).toBe(true);
		expect(catalog.has("test", "2", "server-1")).toBe(false);
		expect(catalog.has("posts", undefined, "server-1")).toBe(false);
	});

	it("should be find the service", () => {
		expect(catalog.get("test", undefined, "server-2")).toBeUndefined();
		expect(catalog.get("test", undefined, "server-1")).toBeDefined();
		expect(catalog.get("test", "2", "server-1")).toBeUndefined();
		expect(catalog.get("posts", undefined, "server-1")).toBeUndefined();
	});

	it("should remove action & event endpoints by nodeID", () => {
		broker.registry.actions.removeByService = jest.fn();
		broker.registry.events.removeByService = jest.fn();

		catalog.removeAllByNodeID("server-2");
		expect(broker.registry.actions.removeByService).toHaveBeenCalledTimes(0);
		expect(broker.registry.events.removeByService).toHaveBeenCalledTimes(0);

		catalog.removeAllByNodeID("server-1");
		expect(broker.registry.actions.removeByService).toHaveBeenCalledTimes(1);
		expect(broker.registry.actions.removeByService).toHaveBeenCalledWith(catalog.services[0]);
		expect(broker.registry.events.removeByService).toHaveBeenCalledTimes(1);
		expect(broker.registry.events.removeByService).toHaveBeenCalledWith(catalog.services[0]);

		expect(catalog.services.length).toBe(1);
	});

	it("should remove actions & events by service", () => {
		broker.registry.actions.removeByService = jest.fn();
		broker.registry.events.removeByService = jest.fn();
		let svc = catalog.services[0];

		catalog.remove("test", undefined, "server-2");
		expect(broker.registry.actions.removeByService).toHaveBeenCalledTimes(0);
		expect(broker.registry.events.removeByService).toHaveBeenCalledTimes(0);

		catalog.remove("test", undefined, "server-1");
		expect(broker.registry.actions.removeByService).toHaveBeenCalledTimes(1);
		expect(broker.registry.actions.removeByService).toHaveBeenCalledWith(svc);
		expect(broker.registry.events.removeByService).toHaveBeenCalledTimes(1);
		expect(broker.registry.events.removeByService).toHaveBeenCalledWith(svc);

		expect(catalog.services.length).toBe(0);
	});

	it("should return with action list", () => {
		catalog.add("posts", 2, "server-2");
		let res = catalog.list({});
		expect(res).toEqual([{
			"name": 2,
			"nodeID": undefined,
			"settings": undefined,
			"version": "server-2"
		}]);
	});

});

