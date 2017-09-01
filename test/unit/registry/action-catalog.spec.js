"use strict";
/*
jest.mock("../../../src/registry/endpoint-list", () => ({
	add: jest.fn()
}));*/

let Strategy = require("../../../src/strategies").RoundRobin;
let ActionCatalog = require("../../../src/registry/action-catalog");
let EndpointList = require("../../../src/registry/endpoint-list");
let ActionEndpoint = require("../../../src/registry/endpoint-action");
let ActionEndpointCB = require("../../../src/registry/endpoint-cb");
let ServiceBroker = require("../../../src/service-broker");

describe("Test ActionCatalog constructor", () => {

	let broker = new ServiceBroker();
	let registry = broker.registry;

	it("test without CB", () => {
		let catalog = new ActionCatalog(registry, broker, Strategy);

		expect(catalog).toBeDefined();
		expect(catalog.registry).toBe(registry);
		expect(catalog.broker).toBe(broker);
		expect(catalog.logger).toBe(registry.logger);
		expect(catalog.StrategyFactory).toBe(Strategy);
		expect(catalog.actions).toBeInstanceOf(Map);
		expect(catalog.EndpointFactory).toBe(ActionEndpoint);
	});

	it("test with CB", () => {
		registry.opts.circuitBreaker.enabled = true;
		let catalog = new ActionCatalog(registry, broker, Strategy);

		expect(catalog).toBeDefined();
		expect(catalog.registry).toBe(registry);
		expect(catalog.broker).toBe(broker);
		expect(catalog.logger).toBe(registry.logger);
		expect(catalog.StrategyFactory).toBe(Strategy);
		expect(catalog.actions).toBeInstanceOf(Map);
		expect(catalog.EndpointFactory).toBe(ActionEndpointCB);
	});

});

describe("Test ActionCatalog methods", () => {
	let broker = new ServiceBroker();
	let catalog = new ActionCatalog(broker.registry, broker, Strategy);
	let list;
	let service = { name: "test" };

	it("should create an EndpointList and add to 'actions'", () => {
		let node = { id: "server-1" };
		let action = { name: "test.hello" };

		expect(catalog.actions.size).toBe(0);

		list = catalog.add(node, service, action);

		expect(catalog.actions.size).toBe(1);
		expect(list).toBeInstanceOf(EndpointList);

	});

	it("should not create a new EndpointList just add new node", () => {
		let node = { id: "server-2" };
		let service = {};
		let action = { name: "test.hello" };

		list.add = jest.fn();

		let res = catalog.add(node, service, action);

		expect(catalog.actions.size).toBe(1);
		expect(res).toBe(list);

		expect(list.add).toHaveBeenCalledTimes(1);
		expect(list.add).toHaveBeenCalledWith(node, service, action);

	});

	it("should return the list", () => {
		expect(catalog.get("test.hello")).toBe(list);
		expect(catalog.get("not.found")).toBeUndefined();
	});

	it("should call list.removeByNodeID", () => {
		list.removeByNodeID = jest.fn();

		catalog.remove("test.hello", "server-2");
		expect(list.removeByNodeID).toHaveBeenCalledTimes(1);
		expect(list.removeByNodeID).toHaveBeenCalledWith("server-2");

		list.removeByNodeID.mockClear();
		catalog.remove("not-found", "server-2");
		expect(list.removeByNodeID).toHaveBeenCalledTimes(0);
	});

	it("should call list.removeByService", () => {
		let service2 = { name: "echo" };
		let list2 = catalog.add(broker.registry.nodes.localNode, service2, { name: "echo.reply", cache: true });

		list.removeByService = jest.fn();
		list2.removeByService = jest.fn();

		catalog.removeByService(service2);
		expect(list.removeByService).toHaveBeenCalledTimes(1);
		expect(list.removeByService).toHaveBeenCalledWith(service2);
		expect(list2.removeByService).toHaveBeenCalledTimes(1);
		expect(list2.removeByService).toHaveBeenCalledWith(service2);
	});

	it("should return with action list", () => {
		let res = catalog.list({});
		expect(res).toEqual([
			{
				"action": {
					"name": "test.hello"
				},
				"available": true,
				"count": 1,
				"hasLocal": false,
				"name": "test.hello"
			},
			{
				"action": {
					"name": "echo.reply",
					"cache": true
				},
				"available": true,
				"count": 1,
				"hasLocal": true,
				"name": "echo.reply"
			}
		]);

		res = catalog.list({ withEndpoints: true });
		expect(res).toEqual([
			{
				"action": {
					"name": "test.hello"
				},
				"available": true,
				"count": 1,
				"endpoints": [
					{
						"nodeID": "server-1",
						"state": true
					}
				],
				"hasLocal": false,
				"name": "test.hello"
			},
			{
				"action": {
					"name": "echo.reply",
					"cache": true
				},
				"available": true,
				"count": 1,
				"endpoints": [
					{
						"nodeID": broker.registry.nodes.localNode.id,
						"state": true
					}
				],
				"hasLocal": true,
				"name": "echo.reply"
			}
		]);
	});

});

