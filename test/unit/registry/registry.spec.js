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

		expect(registry.opts).toEqual({ "circuitBreaker": {"enabled": false, "failureOnReject": true, "failureOnTimeout": true, "halfOpenTime": 10000, "maxFailures": 3}, "preferLocal": true, strategy: RoundRobinStrategy});
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
			metadata: {},
			actions: {},
			events: []
		};

		registry.registerLocalService(svc);

		expect(registry.services.add).toHaveBeenCalledTimes(1);
		expect(registry.services.add).toHaveBeenCalledWith(registry.nodes.localNode, "users", 2, svc.settings, svc.metadata);

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
			settings: {},
			metadata: {}
		};

		registry.registerLocalService(svc);

		expect(registry.services.add).toHaveBeenCalledTimes(1);
		expect(registry.services.add).toHaveBeenCalledWith(registry.nodes.localNode, "users", 2, svc.settings, svc.metadata);

		expect(registry.registerActions).toHaveBeenCalledTimes(0);

		expect(registry.registerEvents).toHaveBeenCalledTimes(0);
	});
});

describe("Test Registry.registerServices", () => {

	let broker = new ServiceBroker();
	let registry = broker.registry;

	let node = { id: "node-11" };

	let serviceItem = {
		update: jest.fn()
	};

	registry.services.get = jest.fn(() => null);
	registry.services.add = jest.fn(() => serviceItem);
	registry.unregisterService = jest.fn();
	registry.registerActions = jest.fn();
	registry.unregisterAction = jest.fn();
	registry.registerEvents = jest.fn();
	registry.unregisterEvent = jest.fn();

	it("should call services.add", () => {
		let service = {
			name: "users",
			version: 2,
			settings: { a: 5 },
			actions: {
				"users.find"() {},
				"users.get"() {}
			},
			events: {
				"user.created"() {},
				"user.removed"() {}
			}
		};

		registry.registerServices(node, [service]);

		expect(registry.services.add).toHaveBeenCalledTimes(1);
		expect(registry.services.add).toHaveBeenCalledWith(node, "users", 2, service.settings, undefined);
		expect(serviceItem.update).toHaveBeenCalledTimes(0);

		expect(registry.registerActions).toHaveBeenCalledTimes(1);
		expect(registry.registerActions).toHaveBeenCalledWith(node, serviceItem, service.actions);

		expect(registry.unregisterAction).toHaveBeenCalledTimes(0);

		expect(registry.registerEvents).toHaveBeenCalledTimes(1);
		expect(registry.registerEvents).toHaveBeenCalledWith(node, serviceItem, service.events);

		expect(registry.unregisterEvent).toHaveBeenCalledTimes(0);

		expect(registry.unregisterService).toHaveBeenCalledTimes(0);
	});

	it("should update service, actions & events", () => {
		let serviceItem = {
			name: "users",
			version: 2,
			metadata: {},
			node,
			update: jest.fn(),
			equals: jest.fn(() => false),
			actions: {
				"users.find"() {},
				"users.get"() {}
			},
			events: {
				"user.created"() {},
				"user.removed"() {}
			}
		};
		registry.services.get = jest.fn(() => serviceItem);
		registry.services.add.mockClear();
		registry.unregisterService.mockClear();
		registry.registerActions.mockClear();
		registry.unregisterAction.mockClear();
		registry.registerEvents.mockClear();
		registry.unregisterEvent.mockClear();

		let service = {
			name: "users",
			version: 2,
			settings: { b: 3 },
			metadata: { priority: 3 },
			actions: {
				"users.find"() {},
				"users.remove"() {}
			},
			events: {
				"user.created"() {},
				"user.deleted"() {}
			}
		};

		registry.registerServices(node, [service]);

		expect(registry.services.add).toHaveBeenCalledTimes(0);

		expect(registry.services.get).toHaveBeenCalledTimes(1);
		expect(registry.services.get).toHaveBeenCalledWith("users", 2, node.id);

		expect(serviceItem.update).toHaveBeenCalledTimes(1);
		expect(serviceItem.update).toHaveBeenCalledWith(service);

		expect(registry.registerActions).toHaveBeenCalledTimes(1);
		expect(registry.registerActions).toHaveBeenCalledWith(node, serviceItem, service.actions);

		expect(registry.unregisterAction).toHaveBeenCalledTimes(1);
		expect(registry.unregisterAction).toHaveBeenCalledWith(node, "users.get");

		expect(registry.registerEvents).toHaveBeenCalledTimes(1);
		expect(registry.registerEvents).toHaveBeenCalledWith(node, serviceItem, service.events);

		expect(registry.unregisterEvent).toHaveBeenCalledTimes(1);
		expect(registry.unregisterEvent).toHaveBeenCalledWith(node, "user.removed");

		expect(registry.unregisterService).toHaveBeenCalledTimes(0);

		// For next test
		registry.services.services.push(serviceItem);
	});

	it("should remove old service", () => {
		registry.services.get = jest.fn();
		registry.services.add.mockClear();
		registry.unregisterService.mockClear();

		let service = {
			name: "posts"
		};

		registry.registerServices(node, [service]);

		expect(registry.unregisterService).toHaveBeenCalledTimes(1);
		expect(registry.unregisterService).toHaveBeenCalledWith("users", 2, "node-11");
	});

});

describe("Test Registry.unregisterService & unregisterServicesByNode", () => {

	let broker = new ServiceBroker();
	let registry = broker.registry;

	registry.services.remove = jest.fn();
	registry.services.removeAllByNodeID = jest.fn();

	it("should call services remove method", () => {
		registry.unregisterService("posts", 2, "node-11");

		expect(registry.services.remove).toHaveBeenCalledTimes(1);
		expect(registry.services.remove).toHaveBeenCalledWith("posts", 2, "node-11");
	});

	it("should call services remove method with local nodeID", () => {
		registry.services.remove.mockClear();

		registry.unregisterService("posts", 2);

		expect(registry.services.remove).toHaveBeenCalledTimes(1);
		expect(registry.services.remove).toHaveBeenCalledWith("posts", 2, broker.nodeID);
	});

	it("should call services removeAllByNodeID method", () => {
		registry.services.removeAllByNodeID.mockClear();

		registry.unregisterServicesByNode("node-2");

		expect(registry.services.removeAllByNodeID).toHaveBeenCalledTimes(1);
		expect(registry.services.removeAllByNodeID).toHaveBeenCalledWith("node-2");
	});

});

describe("Test Registry.registerActions", () => {

	let broker = new ServiceBroker();
	let registry = broker.registry;

	registry.actions.add = jest.fn();
	let service = {
		addAction: jest.fn()
	};
	let node = { id: "node-11" };

	it("should call actions add & service addAction methods", () => {
		registry.registerActions(node, service, {
			"users.find": { name: "users.find" },
			"users.save": { name: "users.save" },
		});

		expect(registry.actions.add).toHaveBeenCalledTimes(2);
		expect(registry.actions.add).toHaveBeenCalledWith(node, service, {"name": "users.find"});
		expect(registry.actions.add).toHaveBeenCalledWith(node, service, {"name": "users.save"});

		expect(service.addAction).toHaveBeenCalledTimes(2);
		expect(service.addAction).toHaveBeenCalledWith({"name": "users.find"});
		expect(service.addAction).toHaveBeenCalledWith({"name": "users.save"});
	});
});

describe("Test Registry.unregisterAction", () => {

	let broker = new ServiceBroker();
	let registry = broker.registry;

	registry.actions.remove = jest.fn();

	it("should call actions remove method", () => {
		registry.unregisterAction({ id: "node-11" }, "posts.find");

		expect(registry.actions.remove).toHaveBeenCalledTimes(1);
		expect(registry.actions.remove).toHaveBeenCalledWith("posts.find", "node-11");
	});

});

describe("Test Registry.registerEvents", () => {

	let broker = new ServiceBroker();
	let registry = broker.registry;

	registry.events.add = jest.fn();
	let service = {
		addEvent: jest.fn()
	};
	let node = { id: "node-11" };

	it("should call events add & service addEvent methods", () => {
		registry.registerEvents(node, service, {
			"user.created": { name: "user.created" },
			"user.removed": { name: "user.removed" },
		});

		expect(registry.events.add).toHaveBeenCalledTimes(2);
		expect(registry.events.add).toHaveBeenCalledWith(node, service, {"name": "user.created"});
		expect(registry.events.add).toHaveBeenCalledWith(node, service, {"name": "user.removed"});

		expect(service.addEvent).toHaveBeenCalledTimes(2);
		expect(service.addEvent).toHaveBeenCalledWith({"name": "user.created"});
		expect(service.addEvent).toHaveBeenCalledWith({"name": "user.removed"});
	});

});

describe("Test Registry.unregisterEvent", () => {

	let broker = new ServiceBroker();
	let registry = broker.registry;

	registry.events.remove = jest.fn();

	it("should call events remove method", () => {
		registry.unregisterEvent({ id: "node-11" }, "posts.find");

		expect(registry.events.remove).toHaveBeenCalledTimes(1);
		expect(registry.events.remove).toHaveBeenCalledWith("posts.find", "node-11");
	});

});

describe("Test Registry.processNodeInfo", () => {
	let broker = new ServiceBroker();
	let registry = broker.registry;

	registry.nodes.processNodeInfo = jest.fn();

	it("should call registry.nodes.processNodeInfo method", () => {
		let payload = {};
		registry.processNodeInfo(payload);

		expect(registry.nodes.processNodeInfo).toHaveBeenCalledTimes(1);
		expect(registry.nodes.processNodeInfo).toHaveBeenCalledWith(payload);
	});
});

describe("Test Registry.nodeDisconnected", () => {
	let broker = new ServiceBroker();
	let registry = broker.registry;

	registry.nodes.disconnected = jest.fn();

	it("should call registry.nodes.disconnected method", () => {
		let payload = { sender: "node-2" };
		registry.nodeDisconnected(payload);

		expect(registry.nodes.disconnected).toHaveBeenCalledTimes(1);
		expect(registry.nodes.disconnected).toHaveBeenCalledWith("node-2", false);
	});
});

describe("Test Registry.nodeHeartbeat", () => {
	let broker = new ServiceBroker();
	let registry = broker.registry;

	registry.nodes.heartbeat = jest.fn();

	it("should call registry.nodes.heartbeat method", () => {
		let payload = {};
		registry.nodeHeartbeat(payload);

		expect(registry.nodes.heartbeat).toHaveBeenCalledTimes(1);
		expect(registry.nodes.heartbeat).toHaveBeenCalledWith(payload);
	});
});

describe("Test Registry.getNodeList", () => {
	let broker = new ServiceBroker();
	let registry = broker.registry;

	registry.nodes.list = jest.fn();

	it("should call registry.nodes.list method", () => {
		let opts = {};
		registry.nodes.list(opts);

		expect(registry.nodes.list).toHaveBeenCalledTimes(1);
		expect(registry.nodes.list).toHaveBeenCalledWith(opts);
	});
});

describe("Test Registry.getServiceList", () => {
	let broker = new ServiceBroker();
	let registry = broker.registry;

	registry.services.list = jest.fn();

	it("should call registry.services.list method", () => {
		let opts = {};
		registry.getServiceList(opts);

		expect(registry.services.list).toHaveBeenCalledTimes(1);
		expect(registry.services.list).toHaveBeenCalledWith(opts);
	});
});

describe("Test Registry.getActionList", () => {
	let broker = new ServiceBroker();
	let registry = broker.registry;

	registry.actions.list = jest.fn();

	it("should call registry.actions.list method", () => {
		let opts = {};
		registry.getActionList(opts);

		expect(registry.actions.list).toHaveBeenCalledTimes(1);
		expect(registry.actions.list).toHaveBeenCalledWith(opts);
	});
});

describe("Test Registry.getEventList", () => {
	let broker = new ServiceBroker();
	let registry = broker.registry;

	registry.events.list = jest.fn();

	it("should call registry.events.list method", () => {
		let opts = {};
		registry.getEventList(opts);

		expect(registry.events.list).toHaveBeenCalledTimes(1);
		expect(registry.events.list).toHaveBeenCalledWith(opts);
	});
});

describe("Test Registry.hasService", () => {
	let broker = new ServiceBroker();
	let registry = broker.registry;

	registry.services.has = jest.fn();

	it("should call registry.services.has method", () => {
		registry.hasService("posts", 2);

		expect(registry.services.has).toHaveBeenCalledTimes(1);
		expect(registry.services.has).toHaveBeenCalledWith("posts", 2, undefined);
	});
});
