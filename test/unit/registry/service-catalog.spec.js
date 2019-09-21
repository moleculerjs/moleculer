"use strict";

let ServiceCatalog = require("../../../src/registry/service-catalog");
let ServiceItem = require("../../../src/registry/service-item");
let ServiceBroker = require("../../../src/service-broker");

describe("Test ServiceCatalog constructor", () => {

	let broker = new ServiceBroker({ logger: false });
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
	let broker = new ServiceBroker({ nodeID: "master", logger: false });
	let catalog = new ServiceCatalog(broker.registry, broker);
	let node = { id: "server-1" };
	let svc;

	it("should create a ServiceItem and add to 'events'", () => {

		expect(catalog.services.length).toBe(0);

		svc = catalog.add(node, { name: "test", fullName: "test", settings: { a: 5 } });

		expect(catalog.services.length).toBe(1);
		expect(svc).toBeInstanceOf(ServiceItem);
	});

	it("should be find the service", () => {
		expect(catalog.has("test", "server-2")).toBe(false);
		expect(catalog.has("test", "server-1")).toBe(true);
		expect(catalog.has("v2.test", "server-1")).toBe(false);
		expect(catalog.has("posts", "server-1")).toBe(false);
	});

	it("should be find the service", () => {
		expect(catalog.get("test", "server-2")).toBeUndefined();
		expect(catalog.get("test", "server-1")).toBeDefined();
		expect(catalog.get("v2.test", "server-1")).toBeUndefined();
		expect(catalog.get("posts", "server-1")).toBeUndefined();
	});

	it("should remove action & event endpoints by nodeID", () => {
		broker.registry.actions.removeByService = jest.fn();
		broker.registry.events.removeByService = jest.fn();

		catalog.removeAllByNodeID("server-2");
		expect(broker.registry.actions.removeByService).toHaveBeenCalledTimes(0);
		expect(broker.registry.events.removeByService).toHaveBeenCalledTimes(0);

		catalog.removeAllByNodeID("server-1");
		expect(broker.registry.actions.removeByService).toHaveBeenCalledTimes(1);
		expect(broker.registry.actions.removeByService).toHaveBeenCalledWith(svc);
		expect(broker.registry.events.removeByService).toHaveBeenCalledTimes(1);
		expect(broker.registry.events.removeByService).toHaveBeenCalledWith(svc);

		expect(catalog.services.length).toBe(0);
	});

	it("should remove actions & events by service", () => {
		broker.registry.actions.removeByService = jest.fn();
		broker.registry.events.removeByService = jest.fn();

		svc = catalog.add(node, { name: "test", fullName: "test" });

		catalog.remove("test", "server-2");
		expect(broker.registry.actions.removeByService).toHaveBeenCalledTimes(0);
		expect(broker.registry.events.removeByService).toHaveBeenCalledTimes(0);

		catalog.remove("test", "server-1");
		expect(broker.registry.actions.removeByService).toHaveBeenCalledTimes(1);
		expect(broker.registry.actions.removeByService).toHaveBeenCalledWith(svc);
		expect(broker.registry.events.removeByService).toHaveBeenCalledTimes(1);
		expect(broker.registry.events.removeByService).toHaveBeenCalledWith(svc);

		expect(catalog.services.length).toBe(0);
	});

	it("should return with service list", () => {
		catalog.add({ id: broker.nodeID, available: true }, { name: "$node", fullName: "$node" }, true);

		let node2 = { id: "server-2", available: true };
		catalog.add(node2, { name: "$node", fullName: "$node" });

		let svc = catalog.add(node2, { name: "posts", fullName: "v2.posts", version: 2, settings: { a: 5 }, metadata: { priority:  5 } });
		svc.addAction({ name: "posts.find" });
		svc.addEvent({ name: "user.created" });
		svc.addEvent({ name: "$services.changed" }); // internal

		let res = catalog.list({});
		expect(res).toEqual([{
			"name": "$node",
			"fullName": "$node",
			"nodeID": broker.nodeID,
			"settings": undefined,
			"metadata": {},
			"version": undefined,
			"available": true
		}, {
			"name": "$node",
			"fullName": "$node",
			"nodeID": "server-2",
			"settings": undefined,
			"metadata": {},
			"version": undefined,
			"available": true
		}, {
			"name": "posts",
			"fullName": "v2.posts",
			"nodeID": "server-2",
			"settings": {
				"a": 5
			},
			"metadata": { priority: 5 },
			"version": 2,
			"available": true
		}]);

		res = catalog.list({ grouping: true });
		expect(res).toEqual([{
			"name": "$node",
			"fullName": "$node",
			"settings": undefined,
			"metadata": {},
			"version": undefined,
			"available": true,
			nodes: [
				"master",
				"server-2"
			]
		}, {
			"name": "posts",
			"fullName": "v2.posts",
			"settings": {
				"a": 5
			},
			"metadata": { priority: 5 },
			"version": 2,
			"available": true,
			nodes: [
				"server-2"
			]
		}]);

		res = catalog.list({ onlyLocal: true });
		expect(res).toEqual([{
			"name": "$node",
			"fullName": "$node",
			"nodeID": broker.nodeID,
			"settings": undefined,
			"metadata": {},
			"version": undefined,
			"available": true
		}]);

		res = catalog.list({ skipInternal: true, withActions: true, withEvents: true });
		expect(res).toEqual([{
			"actions": {
				"posts.find": {
					"name": "posts.find"
				}
			},
			"events": {
				"user.created": {
					"name": "user.created"
				}
			},
			"name": "posts",
			"fullName": "v2.posts",
			"nodeID": "server-2",
			"settings": {
				"a": 5
			},
			"metadata": {
				"priority": 5
			},
			"version": 2,
			"available": true
		}]);

		svc.node.available = false;
		res = catalog.list({ onlyAvailable : true });
		expect(res).toEqual([{
			"name": "$node",
			"fullName": "$node",
			"nodeID": broker.nodeID,
			"settings": undefined,
			"metadata": {},
			"version": undefined,
			"available": true
		}]);

	});

	it("should return with service list for info", () => {
		let node2 = { id: "server-2", available: true };
		catalog.add(node2, { name: "$node", fullName: "$node" });

		let svc = catalog.add(
			{ id: broker.nodeID, available: true },
			{ name: "posts", fullName: "v2.posts", version: 2, settings: { a: 5 }, metadata: { priority:  5 } },
			true);

		svc.addAction({ name: "posts.find" });
		svc.addEvent({ name: "user.created" });
		svc.addEvent({ name: "$services.changed" }); // internal

		let res = catalog.getLocalNodeServices();
		expect(res).toEqual([{
			"name": "$node",
			"fullName": "$node",
			"actions": {},
			"dependencies": undefined,
			"events": {},
			"metadata": {},
			"settings": undefined,
			"version": undefined
		}, {
			"name": "posts",
			"fullName": "v2.posts",
			"version": 2,
			"settings": {
				"a": 5
			},
			"actions": {
				"posts.find": {
					"name": "posts.find"
				}
			},
			"dependencies": undefined,
			"events": {
				"user.created": {
					"name": "user.created"
				},
				"$services.changed": {
					"name": "$services.changed"
				}
			},
			"metadata": {
				"priority": 5
			},
		}]);

	});

});

