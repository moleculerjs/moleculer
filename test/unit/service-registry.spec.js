"use strict";

const ServiceRegistry = require("../../src/service-registry");
const ServiceBroker = require("../../src/service-broker");
const lolex = require("lolex");

// Registry strategies
const { STRATEGY_ROUND_ROBIN, STRATEGY_RANDOM } = require("../../src/constants");

// Circuit-breaker states
const { CIRCUIT_CLOSE, CIRCUIT_HALF_OPEN, CIRCUIT_OPEN } = require("../../src/constants");

describe.skip("Test constructor", () => {

	it("should create instance with default options", () => {
		let registry = new ServiceRegistry();
		expect(registry).toBeDefined();
		expect(registry.opts).toEqual({"preferLocal": true, "strategy": STRATEGY_ROUND_ROBIN});
		expect(registry.actions).toBeInstanceOf(Map);
	});

	it("should create instance with options", () => {
		let opts = {
			preferLocal: false,
			strategy: STRATEGY_RANDOM
		};
		let registry = new ServiceRegistry(opts);
		expect(registry).toBeDefined();
		expect(registry.opts).toEqual({"preferLocal": false, "strategy": STRATEGY_RANDOM});
	});

	it("should create instance with options via broker", () => {
		const broker = new ServiceBroker({
			registry: {
				preferLocal: false,
				strategy: STRATEGY_RANDOM	
			}			
		});
		let registry = broker.serviceRegistry;
		expect(registry).toBeDefined();
		expect(registry.opts).toEqual({"preferLocal": false, "strategy": STRATEGY_RANDOM});
	});

});

describe.skip("Test registry.init", () => {
	const broker = new ServiceBroker();

	it("should set broker to local var", () => {
		let registry = new ServiceRegistry();
		registry.init(broker);
		expect(registry.broker).toBe(broker);
	});

});

describe.skip("Test registry.registerAction", () => {
	const broker = new ServiceBroker({ internalActions: false });
	const registry = broker.serviceRegistry;

	let action = {
		name: "posts.find",
		handler: jest.fn()
	};

	it("should set local action and create an EndpointList", () => {
		expect(registry.actions.size).toBe(0);
		const res = registry.registerAction(null, action);
		expect(res).toBe(true);
		expect(registry.actions.size).toBe(1);

		let endpoint = registry.findAction("posts.find");
		expect(endpoint).toBeInstanceOf(ServiceRegistry.EndpointList);
		expect(endpoint.count()).toBe(1);
	});

	it("should set local action but not create a new EndpointList", () => {
		const res = registry.registerAction(null, action);
		expect(res).toBe(false);
		expect(registry.actions.size).toBe(1);
	});

	it("should set remote action but not create a new EndpointList", () => {
		const res = registry.registerAction("server-2", action);
		expect(res).toBe(true);
		expect(registry.actions.size).toBe(1);

		let endpoint = registry.findAction("posts.find");
		expect(endpoint.count()).toBe(2);
	});

});

describe.skip("Test registry.unregister", () => {
	const broker = new ServiceBroker({ internalActions: false });
	const registry = broker.serviceRegistry;

	let action = {
		name: "posts.find",
		handler: jest.fn()
	};

	registry.registerAction(null, action);
	registry.registerAction("server-2", action);

	it("should count endpoint equals 2", () => {
		let endpoint = registry.findAction("posts.find");
		expect(endpoint.count()).toBe(2);
	});

	it("should remove 'server-2' endpoint from list", () => {
		registry.unregisterAction("server-2", action);
		let endpoint = registry.findAction("posts.find");
		expect(endpoint.count()).toBe(1);
	});

});

describe.skip("Test registry.findAction", () => {
	const broker = new ServiceBroker({ internalActions: false });
	const registry = broker.serviceRegistry;

	let action = {
		name: "posts.find",
		handler: jest.fn()
	};

	it("should returns undefined if action is not exist", () => {
		let endpoint = registry.findAction("posts.find");
		expect(endpoint).toBeUndefined();
	});

	it("should return the endpoint if action is exist", () => {
		registry.registerAction("server-2", action);
		let endpoint = registry.findAction("posts.find");
		expect(endpoint).toBeDefined();
	});

});

describe.skip("Test registry.findAction with internal actions", () => {
	const broker = new ServiceBroker({ internalActions: true, registry: { preferLocal: false } });
	const registry = broker.serviceRegistry;

	let action = {
		name: "$node.list",
		handler: jest.fn()
	};

	registry.registerAction("server-2", action);

	it("should return the endpoint if action is exist", () => {
		let endpoint = registry.findAction("$node.list").nextAvailable();
		expect(endpoint).toBeDefined();
		expect(endpoint.nodeID).toBeNull();

		endpoint = registry.findAction("$node.list").nextAvailable();
		expect(endpoint).toBeDefined();
		expect(endpoint.nodeID).toBeNull();
	});

});

describe.skip("Test registry.getEndpointByNodeID", () => {
	const broker = new ServiceBroker({ internalActions: true, registry: { preferLocal: false } });
	const registry = broker.serviceRegistry;

	let action = {
		name: "$node.list",
		custom: 100,
		handler: jest.fn()
	};

	registry.registerAction("server-2", action);

	it("check the count of nodes", () => {
		let item = registry.findAction("$node.list");
		expect(item.count()).toBe(2);
	});

	it("should return the endpoint if action is exist", () => {
		let endpoint = registry.getEndpointByNodeID("$node.list", "server-2");
		expect(endpoint).toBeDefined();
		expect(endpoint.local).toBe(false);
		expect(endpoint.action).toBeDefined();
		expect(endpoint.action.custom).toBe(100);
	});

	it("should not return the endpoint if endpoint is not available", () => {
		let endpoint = registry.getEndpointByNodeID("$node.list", "server-2");
		endpoint.state = CIRCUIT_OPEN;

		endpoint = registry.getEndpointByNodeID("$node.list", "server-2");
		expect(endpoint).toBeUndefined();
	});

	it("should not return endpoint if action is not exist", () => {
		let endpoint = registry.getEndpointByNodeID("math.pow", "server-2");
		expect(endpoint).toBeUndefined();
	});

	it("should not return endpoint if node is not exist", () => {
		let endpoint = registry.getEndpointByNodeID("$node.list", "server-123");
		expect(endpoint).toBeUndefined();
	});

});

describe.skip("Test registry.hasAction", () => {
	const broker = new ServiceBroker({ internalActions: false });
	const registry = broker.serviceRegistry;

	let action = {
		name: "posts.find",
		handler: jest.fn()
	};

	it("should returns false if action is not exist", () => {
		let res = registry.hasAction("posts.find");
		expect(res).toBe(false);
	});

	it("should return the res if action is exist", () => {
		registry.registerAction("server-2", action);
		let res = registry.hasAction("posts.find");
		expect(res).toBe(true);
	});

});

describe.skip("Test registry.count", () => {
	const broker = new ServiceBroker({ internalActions: false });
	const registry = broker.serviceRegistry;

	let action = {
		name: "posts.find",
		handler: jest.fn()
	};

	it("should returns with 0", () => {
		expect(registry.count()).toBe(0);
	});

	it("should return with 1", () => {
		registry.registerAction("server-2", action);
		expect(registry.count()).toBe(1);
	});

});

describe.skip("Test registry.getServicesWithActions", () => {
	describe.skip("Test without internal actions", () => {
		const broker = new ServiceBroker({ internalActions: false });
		const registry = broker.serviceRegistry;

		let action = {
			name: "posts.find",
			cache: true,
			custom: 5,
			handler: jest.fn()
		};

		it("should returns empty list", () => {
			expect(registry.getServicesWithActions()).toEqual([]);
		});

		it("should return empty list because only remote endpoint registered", () => {
			registry.registerAction("server-2", action);
			expect(registry.getServicesWithActions()).toEqual([]);
		});

		it("should return action list", () => {
			registry.registerAction(null, action);
			expect(registry.getServicesWithActions()).toEqual([{"cache": true, "custom": 5, "name": "posts.find"}]);
		});

	});

	describe.skip("Test with internal actions", () => {
		const broker = new ServiceBroker({ internalActions: true });
		const registry = broker.serviceRegistry;

		it("should returns the internal list", () => {
			expect(registry.getServicesWithActions().length).toBe(4);
			expect(registry.getServicesWithActions()).toEqual([{"cache": false, "name": "$node.list"}, {"cache": false, "name": "$node.services"}, {"cache": false, "name": "$node.actions"}, {"cache": false, "name": "$node.health"}]);
		});

	});
});

describe.skip("Test registry.getActionList", () => {
	const broker = new ServiceBroker({ internalActions: true });
	const registry = broker.serviceRegistry;

	let action = {
		name: "posts.find",
		cache: true,
		custom: 5,
		handler: jest.fn()
	};

	it("should return empty list", () => {
		expect(registry.getActionList(true, true, false)).toEqual([]);
	});

	it("should return internal actions", () => {
		expect(registry.getActionList(false, false, false)).toEqual([
			{
				"action": {
					"cache": false,
					"name": "$node.list"
				},
				"available": true,
				"count": 1,
				"hasLocal": true,
				"name": "$node.list"
			},
			{
				"action": {
					"cache": false,
					"name": "$node.services"
				},
				"available": true,
				"count": 1,
				"hasLocal": true,
				"name": "$node.services"
			},
			{
				"action": {
					"cache": false,
					"name": "$node.actions"
				},
				"available": true,
				"count": 1,
				"hasLocal": true,
				"name": "$node.actions"
			},
			{
				"action": {
					"cache": false,
					"name": "$node.health"
				},
				"available": true,
				"count": 1,
				"hasLocal": true,
				"name": "$node.health"
			}
		]);
	});

	it("should return remote actions", () => {
		registry.registerAction("server-2", action);
		expect(registry.getActionList(false, true, false)).toEqual([{"action": {"cache": true, "custom": 5, "name": "posts.find"}, "available": true, "count": 1, "hasLocal": false, "name": "posts.find"}]);
	});

	it("should return empty list because only remote endpoint registered", () => {
		expect(registry.getActionList(true, true, false)).toEqual([]);
	});

	it("should return action list", () => {
		registry.registerAction(null, action);
		expect(registry.getActionList(false, true, false)).toEqual([{"action": {"cache": true, "custom": 5, "name": "posts.find"}, "available": true, "count": 2, "hasLocal": true, "name": "posts.find"}]);
	});

	it("should return action list", () => {
		registry.registerAction("server-3", {
			name: "hello.world"
		});
		expect(registry.getActionList(false, true, true)).toEqual([
			{
				"action": {
					"cache": true,
					"custom": 5,
					"name": "posts.find"
				},
				"available": true,
				"count": 2,
				"endpoints": [
					{
						"nodeID": "server-2",
						"state": "close"
					},
					{
						"nodeID": null,
						"state": "close"
					}
				],
				"hasLocal": true,
				"name": "posts.find"
			},
			{
				"action": {
					"name": "hello.world"
				},
				"available": true,
				"count": 1,
				"endpoints": [
					{
						"nodeID": "server-3",
						"state": "close"
					}
				],
				"hasLocal": false,
				"name": "hello.world"
			}
		]);
	});

});

describe.skip("Test EndpointList constructor", () => {
	const broker = new ServiceBroker();

	it("should create instance with default options", () => {
		let list = new ServiceRegistry.EndpointList(broker);
		expect(list).toBeDefined();
		expect(list.list).toBeDefined();
		expect(list.opts).toEqual({"preferLocal": true, "strategy": STRATEGY_ROUND_ROBIN});
		expect(list.counter).toBe(0);
		expect(list.localEndpoint).toBeNull();
		expect(list.count()).toBe(0);
		expect(list.hasLocal()).toBe(false);
	});

	it("should create instance with options", () => {
		let opts = {
			preferLocal: false,
			strategy: STRATEGY_RANDOM
		};
		let list = new ServiceRegistry.EndpointList(broker, opts);
		expect(list).toBeDefined();
		expect(list.opts).toEqual({"preferLocal": false, "strategy": STRATEGY_RANDOM});
	});

});

describe.skip("Test EndpointList add methods", () => {
	const broker = new ServiceBroker();
	let list = new ServiceRegistry.EndpointList(broker);

	let obj1 = { a: 1 };
	let obj2 = { b: 2 };
	let obj3 = { c: 3 };

	it("should add items and not found local item", () => {
		expect(list.add("node1", obj1)).toBe(true); // remote
		expect(list.add("node2", obj2)).toBe(true); // remote

		expect(list.count()).toBe(2);
		expect(list.hasLocal()).toBe(false);
		expect(list.counter).toBe(0);
	});

	it("should add & found local item", () => {
		list.add(null, obj3); // local

		expect(list.localEndpoint).toBeDefined();
		expect(list.localEndpoint.action).toBe(obj3);
		expect(list.count()).toBe(3);
		expect(list.hasLocal()).toBe(true);
		expect(list.counter).toBe(0);
	});

	it("should re-add remote item", () => {
		expect(list.add("node1", obj1)).toBe(false); // remote

		expect(list.count()).toBe(3);
		expect(list.hasLocal()).toBe(true);
		expect(list.counter).toBe(0);
	});

});

describe.skip("Test EndpointList get methods with round-robin", () => {
	const broker = new ServiceBroker();
	let list = new ServiceRegistry.EndpointList(broker, {
		strategy: STRATEGY_ROUND_ROBIN
	});

	let obj1 = { a: 1 };
	let obj2 = { b: 2 };
	let obj3 = { c: 3 };

	list.add("node1", obj1);
	list.add("node2", obj2);
	list.add("node3", obj3);

	it("should return items", () => {
		let ep = list.get();
		expect(ep.action).toBe(obj1);
		expect(list.counter).toBe(1);
		
		ep = list.get();
		expect(ep.action).toBe(obj2);
		expect(list.counter).toBe(2);

		ep = list.get();
		expect(ep.action).toBe(obj3);
		expect(list.counter).toBe(3);

		ep = list.get();
		expect(ep.action).toBe(obj1);
		expect(list.counter).toBe(1);

	});

});

describe.skip("Test EndpointList nextAvailable methods with preferLocal", () => {
	const broker = new ServiceBroker();
	let list = new ServiceRegistry.EndpointList(broker, {
		preferLocal: true,
		strategy: STRATEGY_ROUND_ROBIN
	});

	let obj0 = { a: 0 };
	let obj1 = { a: 1 };
	let obj2 = { b: 2 };
	let obj3 = { c: 3 };

	it("should return null if list is empty", () => {
		let ep = list.nextAvailable();
		expect(ep).toBeNull();
	});

	it("should return the first item if list is contains one item", () => {
		list.add("node1", obj1);

		let ep = list.nextAvailable();
		expect(ep.action).toBe(obj1);

		ep = list.nextAvailable();
		expect(ep.action).toBe(obj1);
	});

	it("should return null if list is contains one item but unavailable", () => {
		list.list[0].state = CIRCUIT_OPEN;

		let ep = list.nextAvailable();
		expect(ep).toBeNull();

		list.list[0].state = CIRCUIT_CLOSE;
	});

	it("should return the local item if list is contains local item", () => {
		list.add(null, obj0);

		let ep = list.nextAvailable();
		expect(ep.action).toBe(obj0);

		ep = list.nextAvailable();
		expect(ep.action).toBe(obj0);
	});

	it("should return the remote item if the local item is unavailable", () => {
		list.list[1].state = CIRCUIT_OPEN;

		let ep = list.nextAvailable();
		expect(ep.action).toBe(obj1);

		ep = list.nextAvailable();
		expect(ep.action).toBe(obj1);
	});

	it("should return the remote items if list is NOT contains local item", () => {
		list.removeByNode(null);
		list.add("node2", obj2);
		list.add("node3", obj3);

		let ep = list.nextAvailable();
		expect(ep.action).toBe(obj2);

		ep = list.nextAvailable();
		expect(ep.action).toBe(obj3);

		ep = list.nextAvailable();
		expect(ep.action).toBe(obj1);
	});

	it("should skip the unavailable items", () => {
		list.removeByNode(null);
		list.add("node2", obj2);
		list.add("node3", obj3);

		list.list[1].state = CIRCUIT_OPEN;

		let ep = list.nextAvailable();
		expect(ep.action).toBe(obj3);

		// obj2 skipped

		ep = list.nextAvailable();
		expect(ep.action).toBe(obj1);

		ep = list.nextAvailable();
		expect(ep.action).toBe(obj3);
	});

	it("should returns null if every endpoints are unavailable", () => {
		list.list[0].state = CIRCUIT_OPEN;
		list.list[1].state = CIRCUIT_OPEN;
		list.list[2].state = CIRCUIT_OPEN;

		let ep = list.nextAvailable();
		expect(ep).toBeNull();

		ep = list.nextAvailable();
		expect(ep).toBeNull();
	});

});

describe.skip("Test EndpointList getAction method", () => {
	const broker = new ServiceBroker();
	let list = new ServiceRegistry.EndpointList(broker);

	let obj1 = { a: 1 };
	let obj2 = { b: 2 };
	let obj3 = { c: 3 };

	it("should return null", () => {
		expect(list.getAction()).toBeNull();
		expect(list.count()).toBe(0);
	});

	it("should return items", () => {
		list.add("node1", obj1);
		list.add("node2", obj2);
		list.add("node3", obj3);

		expect(list.count()).toBe(3);
		expect(list.getAction()).toBe(obj1);
		expect(list.getAction()).toBe(obj2);
		expect(list.getAction()).toBe(obj3);
	});

});

describe.skip("Test EndpointList getLocalEndpoint & hasLocal methods", () => {
	const broker = new ServiceBroker();
	let list = new ServiceRegistry.EndpointList(broker);

	let obj1 = { a: 1 };
	let obj2 = { b: 2 };
	let obj3 = { c: 3 };

	it("should return null", () => {
		expect(list.hasLocal()).toBe(false);
		expect(list.getLocalEndpoint()).toBeNull();
	});

	it("should return the local endpoint", () => {
		list.add("node1", obj1);
		list.add("node2", obj2);
		list.add(null, obj3);

		expect(list.hasLocal()).toBe(true);
		expect(list.getLocalEndpoint().action).toBe(obj3);
		expect(list.getLocalEndpoint().action).toBe(obj3);
	});

	it("should return null after remove", () => {
		list.removeByNode(null);

		expect(list.hasLocal()).toBe(false);
		expect(list.getLocalEndpoint()).toBeNull();
	});

});

describe.skip("Test EndpointList removeByAction & removeByNode methods", () => {
	const broker = new ServiceBroker();
	let list = new ServiceRegistry.EndpointList(broker);

	let obj1 = { a: 1 };
	let obj2 = { b: 2 };
	let obj3 = { c: 3 };

	it("should not throw Error", () => {
		list.removeByAction();
		list.removeByNode();
	});

	it("should remove item by action", () => {
		list.add("node1", obj1);
		list.add("node2", obj2);
		list.add(null, obj3);

		expect(list.count()).toBe(3);

		list.removeByAction(obj2);
		expect(list.count()).toBe(2);
	});

	it("should remove item by nodeID", () => {
		expect(list.count()).toBe(2);

		list.removeByNode(null);
		expect(list.count()).toBe(1);

		list.removeByNode("node1");
		expect(list.count()).toBe(0);
	});

});

describe.skip("Test Endpoint constructor", () => {
	const broker = new ServiceBroker();
	broker.emit = jest.fn();

	const action = {
		name: "user.list",
		handler: jest.fn()
	};

	it("should create a default instance", () => {
		let item = new ServiceRegistry.Endpoint(broker, "node2", action);

		expect(item).toBeDefined();
		expect(item.broker).toBe(broker);
		expect(item.nodeID).toBe("node2");
		expect(item.action).toBe(action);
		expect(item.local).toBe(false);
		expect(item.state).toBe(CIRCUIT_CLOSE);
		expect(item.failures).toBe(0);
		expect(item.cbTimer).toBeNull();
	});

	it("should create a local instance", () => {
		let item = new ServiceRegistry.Endpoint(broker, null, action);

		expect(item).toBeDefined();
		expect(item.broker).toBe(broker);
		expect(item.nodeID).toBeNull();
		expect(item.action).toBe(action);
		expect(item.local).toBe(true);
		expect(item.state).toBe(CIRCUIT_CLOSE);
		expect(item.failures).toBe(0);
		expect(item.cbTimer).toBeNull();
	});

	it("should update action", () => {
		const action2 = {
			name: "user.find"
		};

		let item = new ServiceRegistry.Endpoint(broker, null, action);
		item.updateAction(action2);
		expect(item.action).toBe(action2);
	});
});

describe.skip("Test Endpoint circuit methods", () => {
	const broker = new ServiceBroker({
		circuitBreaker: {
			maxFailures: 2,
			halfOpenTime: 5 * 1000
		}
	});
	broker.emitLocal = jest.fn();

	const action = {
		name: "user.list",
		handler: jest.fn()
	};

	let item;
	beforeEach(() => {
		item = new ServiceRegistry.Endpoint(broker, null, action);
	});

	it("test available", () => {
		item.state = CIRCUIT_HALF_OPEN;
		expect(item.available()).toBe(true);
		
		item.state = CIRCUIT_OPEN;
		expect(item.available()).toBe(false);

		item.state = CIRCUIT_CLOSE;
		expect(item.available()).toBe(true);
	});

	it("test failure", () => {
		item.circuitOpen = jest.fn();

		expect(item.failures).toBe(0);
		expect(item.circuitOpen).toHaveBeenCalledTimes(0);

		item.failure();
		expect(item.failures).toBe(1);
		expect(item.circuitOpen).toHaveBeenCalledTimes(0);

		item.failure();
		expect(item.failures).toBe(2);
		expect(item.circuitOpen).toHaveBeenCalledTimes(1);
	});

	it("test circuitOpen", () => {
		const clock = lolex.install();

		item.state = CIRCUIT_CLOSE;
		item.circuitHalfOpen = jest.fn();

		item.circuitOpen();

		expect(item.state).toBe(CIRCUIT_OPEN);
		expect(item.cbTimer).toBeDefined();
		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("circuit-breaker.open", { nodeID: null, action, failures: 0 });

		// circuitHalfOpen
		expect(item.circuitHalfOpen).toHaveBeenCalledTimes(0);

		clock.tick(6 * 1000);

		expect(item.circuitHalfOpen).toHaveBeenCalledTimes(1);

		clock.uninstall();
	});

	it("test circuitOpen", () => {
		broker.emitLocal.mockClear();
		item.state = CIRCUIT_OPEN;

		item.circuitHalfOpen();

		expect(item.state).toBe(CIRCUIT_HALF_OPEN);
		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("circuit-breaker.half-open", { nodeID: null, action });

	});

	it("test circuitOpen", () => {
		broker.emitLocal.mockClear();
		item.state = CIRCUIT_HALF_OPEN;
		item.failures = 5;

		item.circuitClose();

		expect(item.state).toBe(CIRCUIT_CLOSE);
		expect(item.failures).toBe(0);
		expect(broker.emitLocal).toHaveBeenCalledTimes(1);
		expect(broker.emitLocal).toHaveBeenCalledWith("circuit-breaker.close", { nodeID: null, action });

	});
});
