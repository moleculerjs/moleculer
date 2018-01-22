"use strict";

let { MoleculerError } = require("../../../src/errors");
let Strategy = require("../../../src/strategies").RoundRobin;
let EndpointList = require("../../../src/registry/endpoint-list");
let ActionEndpoint = require("../../../src/registry/endpoint-action");
let ServiceBroker = require("../../../src/service-broker");

describe("Test EndpointList constructor", () => {

	let broker = new ServiceBroker();
	let registry = broker.registry;
	let list;

	it("should create a new list", () => {
		list = new EndpointList(registry, broker, "listName", "groupName", ActionEndpoint, Strategy);

		expect(list).toBeDefined();
		expect(list.registry).toBe(registry);
		expect(list.broker).toBe(broker);
		expect(list.logger).toBe(registry.logger);
		expect(list.strategy).toBeInstanceOf(Strategy);
		expect(list.name).toBe("listName");
		expect(list.group).toBe("groupName");
		expect(list.internal).toBe(false);
		expect(list.EndPointFactory).toBe(ActionEndpoint);
		expect(list.endpoints).toBeInstanceOf(Array);
		expect(list.localEndpoints).toEqual([]);
	});

	it("should set internal flag", () => {
		let list = new EndpointList(registry, broker, "$listName", "groupName", ActionEndpoint, Strategy);

		expect(list).toBeDefined();
		expect(list.name).toBe("$listName");
		expect(list.internal).toBe(true);
	});

});

describe("Test EndpointList.add", () => {
	let broker = new ServiceBroker();
	let registry = broker.registry;

	let node = { id: "server-1" };
	let service = { name: "test" };
	let action = { name: "test.hello" };

	let list = new EndpointList(registry, broker, "listName", "groupName", ActionEndpoint, Strategy);

	let epUpdate = jest.fn();
	list.EndPointFactory = jest.fn((registry, broker, node, service, action) => ({ local: false, update: epUpdate, node, service, action }));

	it("should add a new Endpoint", () => {
		expect(list.endpoints.length).toBe(0);

		let ep = list.add(node, service, action);

		expect(ep).toBeDefined();
		expect(list.EndPointFactory).toHaveBeenCalledTimes(1);
		expect(list.EndPointFactory).toHaveBeenCalledWith(registry, broker, node, service, action);
		expect(list.endpoints.length).toBe(1);
		expect(list.endpoints[0]).toBe(ep);
		expect(list.localEndpoints).toEqual([]);
	});

	it("should add a new local Endpoint", () => {
		let node2 = { id: "server-2" };
		list.EndPointFactory = jest.fn(() => ({ local: true }));

		let ep = list.add(node2, service, action);

		expect(ep).toBeDefined();
		expect(list.EndPointFactory).toHaveBeenCalledTimes(1);
		expect(list.EndPointFactory).toHaveBeenCalledWith(registry, broker, node2, service, action);
		expect(list.endpoints.length).toBe(2);
		expect(list.endpoints[1]).toBe(ep);
		expect(list.localEndpoints).toEqual([ep]);
		expect(list.hasLocal()).toBe(true);
	});

	it("should update action on existing endpoint", () => {
		list.EndPointFactory.mockClear();
		let action2 = { name: "test.hello2" };

		let ep = list.add(node, service, action2);

		expect(ep).toBeDefined();
		expect(list.EndPointFactory).toHaveBeenCalledTimes(0);
		expect(epUpdate).toHaveBeenCalledTimes(1);
		expect(epUpdate).toHaveBeenCalledWith(action2);
		expect(list.endpoints.length).toBe(2);
	});


});

describe("Test EndpointList.select", () => {
	let broker = new ServiceBroker();
	let registry = broker.registry;
	let ep = {};
	let select = jest.fn(() => ep);
	let MockStrategy = function() {
		return {
			select
		};
	};

	let list = new EndpointList(registry, broker, "listName", "groupName", ActionEndpoint, MockStrategy);

	let arr = [{}, ep];

	it("should call strategy select", () => {
		let res = list.select(arr);
		expect(res).toBe(ep);
		expect(select).toHaveBeenCalledTimes(1);
		expect(select).toHaveBeenCalledWith(arr);
	});

	it("should throw exception if select return with null", () => {
		list.strategy.select = jest.fn();
		expect(() => {
			list.select(arr);
		}).toThrowError(MoleculerError);
	});

});

describe("Test EndpointList.next", () => {
	let broker = new ServiceBroker();
	let registry = broker.registry;

	let ep1, ep2, ep3, ep4;

	let node = { id: "node-1" };
	let service = { name: "test" };
	let action = { name: "test.hello" };

	let list = new EndpointList(registry, broker, "listName", "groupName", ActionEndpoint, Strategy);

	list.select = jest.fn(() => ep1);

	it("should return null if no endpoints", () => {
		expect(list.endpoints.length).toBe(0);

		let ep = list.next();

		expect(ep).toBeNull();
		expect(list.select).toHaveBeenCalledTimes(0);
		expect(list.count()).toBe(0);
	});

	it("should return only one ep", () => {
		ep1 = list.add(node, service, action);

		expect(list.next()).toBe(ep1);
		expect(list.count()).toBe(1);

	});
	it("should return null if only one is not available", () => {
		ep1.state = false;
		expect(list.next()).toBeNull();

		expect(list.select).toHaveBeenCalledTimes(0);

		ep1.state = true;
	});

	it("should return local item is preferLocal is true && local item is available", () => {
		ep2 = list.add({ id: "node-2" }, service, action);
		ep3 = list.add({ id: broker.nodeID }, service, action);
		ep4 = list.add({ id: "node-3" }, service, action);

		expect(list.count()).toBe(4);
		expect(ep3.local).toBe(true);
		expect(list.localEndpoints).toEqual([ep3]);

		expect(list.next()).toBe(ep3);
		expect(list.next()).toBe(ep3);
		expect(list.next()).toBe(ep3);

		expect(list.select).toHaveBeenCalledTimes(0);
	});

	it("should call select if no local ep", () => {
		ep3.state = false;

		expect(list.next()).toBe(ep1);

		expect(list.select).toHaveBeenCalledTimes(1);

		ep3.state = true;
	});

	it("should call select if no local ep", () => {
		list.select.mockClear();
		registry.opts.preferLocal = false;

		expect(list.next()).toBe(ep1);

		expect(list.select).toHaveBeenCalledTimes(1);
	});

	it("should find the first available ep", () => {
		list.select = jest.fn()
			.mockImplementationOnce(() => ep1)
			.mockImplementationOnce(() => ep2)
			.mockImplementationOnce(() => ep3)
			.mockImplementation(() => ep4);

		ep1.state = false;
		ep2.state = false;
		ep3.state = false;
		ep4.state = true;

		expect(list.next()).toBe(ep4);
		expect(list.select).toHaveBeenCalledTimes(4);
	});

	it("should return null, if no available ep", () => {
		list.select = jest.fn()
			.mockImplementationOnce(() => ep1)
			.mockImplementationOnce(() => ep2)
			.mockImplementationOnce(() => ep3)
			.mockImplementation(() => ep4);

		ep1.state = false;
		ep2.state = false;
		ep3.state = false;
		ep4.state = false;

		expect(list.next()).toBeNull();
		expect(list.select).toHaveBeenCalledTimes(4);
	});

	it("should return null if internal & localEndpoint is not available", () => {
		list.select.mockClear();
		list.internal = true;

		expect(list.next()).toBe(null);
		expect(list.select).toHaveBeenCalledTimes(0);
	});

	it("should return always localEndpoint if internal", () => {
		list.select.mockClear();
		list.internal = true;

		ep3.state = true;

		expect(list.next()).toBe(ep3);
		expect(list.next()).toBe(ep3);
		expect(list.next()).toBe(ep3);

		expect(list.select).toHaveBeenCalledTimes(0);

		list.internal = false;
	});

});

describe("Test EndpointList.nextLocal", () => {
	let broker = new ServiceBroker();
	let registry = broker.registry;

	let ep1, ep2, ep3, ep4;

	let node = { id: broker.nodeID };
	let service = { name: "test" };
	let action = { name: "test.hello" };

	let list = new EndpointList(registry, broker, "listName", "groupName", ActionEndpoint, Strategy);
	list.select = jest.fn(() => ep1);

	it("should return null if no endpoints", () => {
		expect(list.endpoints.length).toBe(0);

		let ep = list.nextLocal();

		expect(ep).toBeNull();
		expect(list.select).toHaveBeenCalledTimes(0);
		expect(list.count()).toBe(0);
		expect(list.localEndpoints.length).toBe(0);
	});

	it("should return only one ep", () => {
		ep1 = list.add(node, service, action);

		expect(list.nextLocal()).toBe(ep1);
		expect(list.count()).toBe(1);
		expect(list.localEndpoints.length).toBe(1);
	});

	it("should return null if only one is not available", () => {
		ep1.state = false;
		expect(list.nextLocal()).toBeNull();

		expect(list.select).toHaveBeenCalledTimes(0);

		ep1.state = true;
	});

	it("should call select if there are more ep", () => {
		ep2 = list.add({ id: "node-2" }, service, action);
		ep3 = list.add(node, { name: "test2" }, action);
		ep4 = list.add({ id: "node-3" }, service, action);

		expect(list.localEndpoints.length).toBe(2);
		expect(ep3.local).toBe(true);
		expect(list.localEndpoints).toEqual([ep1, ep3]);

		expect(list.nextLocal()).toBe(ep1);
		expect(list.select).toHaveBeenCalledTimes(1);
	});

	it("should find the first available ep", () => {
		list.select = jest.fn()
			.mockImplementationOnce(() => ep1)
			.mockImplementationOnce(() => ep3);

		ep1.state = false;
		ep3.state = true;

		expect(list.nextLocal()).toBe(ep3);
		expect(list.select).toHaveBeenCalledTimes(2);
	});

	it("should return null, if no available ep", () => {
		list.select = jest.fn()
			.mockImplementationOnce(() => ep1)
			.mockImplementationOnce(() => ep3);

		ep1.state = false;
		ep3.state = false;

		expect(list.nextLocal()).toBeNull();
		expect(list.select).toHaveBeenCalledTimes(2);
	});

});

describe("Test EndpointList.hasAvailable", () => {
	let broker = new ServiceBroker();
	let registry = broker.registry;

	let service = { name: "test" };
	let action = { name: "test.hello" };

	let list = new EndpointList(registry, broker, "listName", "groupName", ActionEndpoint, Strategy);

	let ep1 = list.add({ id: "node-1" }, service, action);
	let ep2 = list.add({ id: broker.nodeID }, service, action);

	it("should return the correct value", () => {
		expect(list.hasAvailable()).toBe(true);

		ep1.state = false;
		expect(list.hasAvailable()).toBe(true);

		ep2.state = false;
		expect(list.hasAvailable()).toBe(false);
	});

});

describe("Test EndpointList.hasLocal", () => {
	let broker = new ServiceBroker();
	let registry = broker.registry;

	let service = { name: "test" };
	let action = { name: "test.hello" };

	let list = new EndpointList(registry, broker, "listName", "groupName", ActionEndpoint, Strategy);

	list.add({ id: "node-1" }, service, action);
	list.add({ id: broker.nodeID }, service, action);

	it("should return the correct value", () => {
		expect(list.hasLocal()).toBe(true);

		list.localEndpoints = [];
		expect(list.hasLocal()).toBe(false);
	});

});

describe("Test EndpointList.getEndpointByNodeID", () => {
	let broker = new ServiceBroker();
	let registry = broker.registry;

	let service = { name: "test" };
	let action = { name: "test.hello" };

	let list = new EndpointList(registry, broker, "listName", "groupName", ActionEndpoint, Strategy);

	let ep1 = list.add({ id: "node-1" }, service, action);
	let ep2 = list.add({ id: broker.nodeID }, service, action);

	it("should return the correct ep", () => {
		expect(list.getEndpointByNodeID(broker.nodeID)).toBe(ep2);
		expect(list.getEndpointByNodeID("node-1")).toBe(ep1);
	});

	it("should return null", () => {
		ep1.state = false;
		expect(list.getEndpointByNodeID("node-1")).toBe(null);
		expect(list.getEndpointByNodeID("node-123")).toBe(null);
	});

});

describe("Test EndpointList.hasNodeID", () => {
	let broker = new ServiceBroker();
	let registry = broker.registry;

	let service = { name: "test" };
	let action = { name: "test.hello" };

	let list = new EndpointList(registry, broker, "listName", "groupName", ActionEndpoint, Strategy);

	list.add({ id: "node-1" }, service, action);
	list.add({ id: broker.nodeID }, service, action);

	it("should return the correct ep", () => {
		expect(list.hasNodeID(broker.nodeID)).toBe(true);
		expect(list.hasNodeID("node-1")).toBe(true);
		expect(list.hasNodeID("node-123")).toBe(false);
	});

});

describe("Test EndpointList.removeByService", () => {
	let broker = new ServiceBroker();
	let registry = broker.registry;

	let service1 = { name: "test" };
	let service2 = { name: "test2" };
	let action = { name: "test.hello" };

	let list = new EndpointList(registry, broker, "listName", "groupName", ActionEndpoint, Strategy);

	list.add({ id: "node-1" }, service1, action);
	list.add({ id: broker.nodeID }, service2, action);
	list.add({ id: "node-2" }, service1, action);

	it("should remove endpoints for service-1", () => {
		expect(list.count()).toBe(3);

		list.removeByService(service1);
		expect(list.count()).toBe(1);
		expect(list.hasNodeID(broker.nodeID)).toBe(true);
		expect(list.hasNodeID("node-1")).toBe(false);
		expect(list.hasNodeID("node-2")).toBe(false);
		expect(list.hasLocal()).toBe(true);

		list.removeByService(service2);
		expect(list.count()).toBe(0);
		expect(list.hasLocal()).toBe(false);
	});

});

describe("Test EndpointList.removeByNodeID", () => {
	let broker = new ServiceBroker();
	let registry = broker.registry;

	let service1 = { name: "test" };
	let service2 = { name: "test2" };
	let action = { name: "test.hello" };

	let list = new EndpointList(registry, broker, "listName", "groupName", ActionEndpoint, Strategy);

	list.add({ id: "node-1" }, service1, action);
	list.add({ id: broker.nodeID }, service2, action);

	it("should remove endpoints for service-1", () => {
		expect(list.count()).toBe(2);

		list.removeByNodeID("node-1");
		expect(list.count()).toBe(1);
		expect(list.hasNodeID(broker.nodeID)).toBe(true);
		expect(list.hasNodeID("node-1")).toBe(false);
		expect(list.hasLocal()).toBe(true);

		list.removeByNodeID(broker.nodeID);
		expect(list.count()).toBe(0);
		expect(list.hasLocal()).toBe(false);
	});

});

describe("Test EndpointList.setLocalEndpoints", () => {
	let broker = new ServiceBroker();
	let registry = broker.registry;

	let service1 = { name: "test" };
	let service2 = { name: "test2" };
	let action = { name: "test.hello" };

	let list = new EndpointList(registry, broker, "listName", "groupName", ActionEndpoint, Strategy);

	list.add({ id: "node-1" }, service1, action);
	let ep2 = list.add({ id: broker.nodeID }, service2, action);

	it("should remove endpoints for service-1", () => {
		expect(list.localEndpoints).toEqual([ep2]);
		list.localEndpoints = [];

		list.setLocalEndpoints();
		expect(list.localEndpoints).toEqual([ep2]);

		list.removeByNodeID(broker.nodeID);
		expect(list.localEndpoints).toEqual([]);
	});

});
