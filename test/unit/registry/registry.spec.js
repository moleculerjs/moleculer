"use strict";

let Registry = require("../../../src/registry/registry");
let ServiceBroker = require("../../../src/service-broker");
let Strategies = require("../../../src/strategies");
const { protectReject } = require("../utils");

describe("Test Registry constructor", () => {

	let broker = new ServiceBroker({ logger: false });
	broker.localBus.on = jest.fn();

	it("test properties", () => {
		let registry = new Registry(broker);

		expect(registry).toBeDefined();
		expect(registry.broker).toBe(broker);
		expect(registry.logger).toBeDefined();

		expect(registry.opts).toEqual({
			preferLocal: true,
			strategy: "RoundRobin"
		});
		expect(registry.StrategyFactory).toBe(Strategies.RoundRobin);
		expect(registry.nodes).toBeDefined();
		expect(registry.services).toBeDefined();
		expect(registry.actions).toBeDefined();
		expect(registry.events).toBeDefined();
	});

	it("test different strategy", () => {
		let broker = new ServiceBroker({
			logger: false,
			registry: {
				strategy: "Random",
				preferLocal: false
			}
		});
		let registry = new Registry(broker);

		expect(registry.opts).toEqual({
			preferLocal: false,
			strategy: "Random"
		});
		expect(registry.StrategyFactory).toBe(Strategies.Random);
	});

	it("test $broker.started event handler", () => {
		let cb;
		broker.localBus.on = jest.fn((name, fn) => {
			if (name == "$broker.started")
				cb = fn;
		});

		let registry = new Registry(broker);

		expect(broker.localBus.on).toHaveBeenCalledTimes(3);
		expect(broker.localBus.on).toHaveBeenCalledWith("$broker.started", jasmine.any(Function));

		registry.regenerateLocalRawInfo = jest.fn();

		cb();

		expect(registry.regenerateLocalRawInfo).toHaveBeenCalledTimes(1);
		expect(registry.regenerateLocalRawInfo).toHaveBeenCalledWith(true);
	});
});

describe("Test Registry.registerLocalService", () => {

	let broker = new ServiceBroker({ logger: false, internalServices: false });
	let registry = broker.registry;
	let seq = registry.nodes.localNode.seq;

	let service = {};

	registry.services.add = jest.fn(() => service);
	registry.registerActions = jest.fn();
	registry.registerEvents = jest.fn();
	registry.regenerateLocalRawInfo = jest.fn();

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

		expect(registry.nodes.localNode.seq).toBe(seq);

		expect(registry.regenerateLocalRawInfo).toHaveBeenCalledTimes(1);
		expect(registry.regenerateLocalRawInfo).toHaveBeenCalledWith(false);
	});

	it("should not call register methods, but increment seq", () => {
		registry.services.add.mockClear();
		registry.registerActions.mockClear();
		registry.registerEvents.mockClear();
		registry.regenerateLocalRawInfo.mockClear();

		let svc = {
			name: "users",
			version: 2,
			settings: {},
			metadata: {}
		};

		return broker.start().catch(protectReject).then(() => {
			expect(registry.regenerateLocalRawInfo).toHaveBeenCalledTimes(1);
			expect(registry.regenerateLocalRawInfo).toHaveBeenCalledWith(true);
			registry.regenerateLocalRawInfo.mockClear();

			registry.registerLocalService(svc);

			expect(registry.services.add).toHaveBeenCalledTimes(1);
			expect(registry.services.add).toHaveBeenCalledWith(registry.nodes.localNode, "users", 2, svc.settings, svc.metadata);

			expect(registry.registerActions).toHaveBeenCalledTimes(0);

			expect(registry.registerEvents).toHaveBeenCalledTimes(0);

			expect(registry.regenerateLocalRawInfo).toHaveBeenCalledTimes(1);
			expect(registry.regenerateLocalRawInfo).toHaveBeenCalledWith(true);
		});
	});
});

describe("Test Registry.registerServices", () => {

	let broker = new ServiceBroker({ logger: false });
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

	let broker = new ServiceBroker({ logger: false });
	let registry = broker.registry;
	let seq = registry.nodes.localNode.seq;

	registry.services.remove = jest.fn();
	registry.services.removeAllByNodeID = jest.fn();
	registry.regenerateLocalRawInfo = jest.fn();

	beforeAll(() => broker.start());
	afterAll(() => broker.stop());

	it("should call services remove method", () => {
		registry.regenerateLocalRawInfo.mockClear();

		registry.unregisterService("posts", 2, "node-11");

		expect(registry.services.remove).toHaveBeenCalledTimes(1);
		expect(registry.services.remove).toHaveBeenCalledWith("posts", 2, "node-11");

		expect(registry.nodes.localNode.seq).toBe(seq);
		expect(registry.regenerateLocalRawInfo).toHaveBeenCalledTimes(0);
	});

	it("should call services remove method with local nodeID", () => {
		registry.regenerateLocalRawInfo.mockClear();
		registry.services.remove.mockClear();

		registry.unregisterService("posts", 2);

		expect(registry.services.remove).toHaveBeenCalledTimes(1);
		expect(registry.services.remove).toHaveBeenCalledWith("posts", 2, broker.nodeID);

		expect(registry.regenerateLocalRawInfo).toHaveBeenCalledTimes(1);
		expect(registry.regenerateLocalRawInfo).toHaveBeenCalledWith(true);
	});

	it("should call services removeAllByNodeID method", () => {
		registry.regenerateLocalRawInfo.mockClear();
		registry.services.removeAllByNodeID.mockClear();

		registry.unregisterServicesByNode("node-2");

		expect(registry.services.removeAllByNodeID).toHaveBeenCalledTimes(1);
		expect(registry.services.removeAllByNodeID).toHaveBeenCalledWith("node-2");
	});

});

describe("Test Registry.registerActions", () => {

	let broker = new ServiceBroker({ logger: false, transporter: "Fake" });
	let registry = broker.registry;

	registry.actions.add = jest.fn();
	let service = {
		addAction: jest.fn()
	};
	let node = { id: "node-11" };

	broker.middlewares.wrapHandler = jest.fn();
	broker.transit.request = jest.fn();

	it("should call actions add & service addAction methods", () => {
		registry.registerActions(node, service, {
			"users.find": { name: "users.find", handler: jest.fn() },
			"users.save": { name: "users.save", handler: jest.fn() },
		});

		expect(registry.actions.add).toHaveBeenCalledTimes(2);
		expect(registry.actions.add).toHaveBeenCalledWith(node, service, { "name": "users.find" });
		expect(registry.actions.add).toHaveBeenCalledWith(node, service, { "name": "users.save" });

		expect(service.addAction).toHaveBeenCalledTimes(2);
		expect(service.addAction).toHaveBeenCalledWith({ "name": "users.find" });
		expect(service.addAction).toHaveBeenCalledWith({ "name": "users.save" });

		expect(broker.middlewares.wrapHandler).toHaveBeenCalledTimes(2);
		expect(broker.middlewares.wrapHandler).toHaveBeenCalledWith("remoteAction", jasmine.any(Function), { "name": "users.find" });
		expect(broker.middlewares.wrapHandler).toHaveBeenCalledWith("remoteAction", jasmine.any(Function), { "name": "users.save" });
	});

	it("should not call actions add & service addAction methods if has visibility", () => {
		registry.actions.add.mockClear();
		service.addAction.mockClear();
		broker.middlewares.wrapHandler.mockClear();
		registry.checkActionVisibility = jest.fn(() => false);

		registry.registerActions(node, service, {
			"users.find": { name: "users.find", handler: jest.fn() },
			"users.save": { name: "users.save", handler: jest.fn() },
		});

		expect(registry.checkActionVisibility).toHaveBeenCalledTimes(2);
		expect(registry.checkActionVisibility).toHaveBeenCalledWith({ name: "users.save", handler: jasmine.any(Function) }, node);
		expect(registry.checkActionVisibility).toHaveBeenCalledWith({ name: "users.find", handler: jasmine.any(Function) }, node);

		expect(registry.actions.add).toHaveBeenCalledTimes(0);
		expect(service.addAction).toHaveBeenCalledTimes(0);
		expect(broker.middlewares.wrapHandler).toHaveBeenCalledTimes(0);
	});
});

describe("Test Registry.checkActionVisibility", () => {

	let broker = new ServiceBroker({ logger: false, transporter: "Fake" });
	let registry = broker.registry;

	it("check if not set visibility", () => {
		expect(registry.checkActionVisibility({}, { local: true })).toBe(true);
		expect(registry.checkActionVisibility({}, { local: false })).toBe(true);
	});

	it("check if set visibility to 'published'", () => {
		expect(registry.checkActionVisibility({ visibility: "published" }, { local: true })).toBe(true);
		expect(registry.checkActionVisibility({ visibility: "published" }, { local: false })).toBe(true);
	});

	it("check if set visibility to 'public'", () => {
		expect(registry.checkActionVisibility({ visibility: "public" }, { local: true })).toBe(true);
		expect(registry.checkActionVisibility({ visibility: "public" }, { local: false })).toBe(true);
	});

	it("check if set visibility to 'protected'", () => {
		expect(registry.checkActionVisibility({ visibility: "protected" }, { local: true })).toBe(true);
		expect(registry.checkActionVisibility({ visibility: "protected" }, { local: false })).toBe(false);
	});

	it("check if set visibility to 'private'", () => {
		expect(registry.checkActionVisibility({ visibility: "private" }, { local: true })).toBe(false);
		expect(registry.checkActionVisibility({ visibility: "private" }, { local: false })).toBe(false);
	});
});

describe("Test Registry.unregisterAction", () => {

	let broker = new ServiceBroker({ logger: false });
	let registry = broker.registry;

	registry.actions.remove = jest.fn();

	it("should call actions remove method", () => {
		registry.unregisterAction({ id: "node-11" }, "posts.find");

		expect(registry.actions.remove).toHaveBeenCalledTimes(1);
		expect(registry.actions.remove).toHaveBeenCalledWith("posts.find", "node-11");
	});

});

describe("Test Registry.registerEvents", () => {

	let broker = new ServiceBroker({ logger: false });
	let registry = broker.registry;

	registry.events.add = jest.fn();
	let service = {
		addEvent: jest.fn()
	};
	let node = { id: "node-11", local: true };

	broker.middlewares.wrapHandler = jest.fn();

	it("should call events add & service addEvent methods", () => {
		registry.registerEvents(node, service, {
			"user.created": { name: "user.created", handler: jest.fn() },
			"user.removed": { name: "user.removed", handler: jest.fn() },
		});

		expect(registry.events.add).toHaveBeenCalledTimes(2);
		expect(registry.events.add).toHaveBeenCalledWith(node, service, { "name": "user.created" });
		expect(registry.events.add).toHaveBeenCalledWith(node, service, { "name": "user.removed" });

		expect(service.addEvent).toHaveBeenCalledTimes(2);
		expect(service.addEvent).toHaveBeenCalledWith({ "name": "user.created" });
		expect(service.addEvent).toHaveBeenCalledWith({ "name": "user.removed" });

		expect(broker.middlewares.wrapHandler).toHaveBeenCalledTimes(2);
		expect(broker.middlewares.wrapHandler).toHaveBeenCalledWith("localEvent", jasmine.any(Function), { "name": "user.created" });
		expect(broker.middlewares.wrapHandler).toHaveBeenCalledWith("localEvent", jasmine.any(Function), { "name": "user.removed" });
	});
});

describe("Test Registry.unregisterEvent", () => {

	let broker = new ServiceBroker({ logger: false });
	let registry = broker.registry;

	registry.events.remove = jest.fn();

	it("should call events remove method", () => {
		registry.unregisterEvent({ id: "node-11" }, "posts.find");

		expect(registry.events.remove).toHaveBeenCalledTimes(1);
		expect(registry.events.remove).toHaveBeenCalledWith("posts.find", "node-11");
	});

});

describe("Test Registry.regenerateLocalRawInfo", () => {
	let broker = new ServiceBroker({ logger: false, nodeID: "node-1" });
	let registry = broker.registry;
	let localNode = registry.nodes.localNode;

	const svc1 = {
		name: "svc1",
		prop: {}
	};

	const svc2 = {
		name: "svc2",
		prop: {}
	};

	// Make some circular references
	svc1.prop.a = svc1;

	registry.services.getLocalNodeServices = jest.fn(() => [svc1, svc2]);

	it("should not call registry getLocalNodeServices if broker is not started", () => {
		broker.started = false;
		expect(registry.regenerateLocalRawInfo()).toEqual({
			"client": localNode.client,
			"config": {},
			"hostname": localNode.hostname,
			"ipList": localNode.ipList,
			"port": null,
			"seq": 1,
			"services": []
		});

		expect(registry.services.getLocalNodeServices).toHaveBeenCalledTimes(0);
	});

	it("should increment seq", () => {
		broker.started = false;
		expect(registry.regenerateLocalRawInfo(true)).toEqual({
			"client": localNode.client,
			"config": {},
			"hostname": localNode.hostname,
			"ipList": localNode.ipList,
			"port": null,
			"seq": 2,
			"services": []
		});

		expect(registry.services.getLocalNodeServices).toHaveBeenCalledTimes(0);
	});

	it("should call registry getLocalNodeServices and return with local rawInfo", () => {
		broker.started = true;
		expect(registry.regenerateLocalRawInfo()).toEqual({
			"client": localNode.client,
			"config": {},
			"hostname": localNode.hostname,
			"ipList": localNode.ipList,
			"port": null,
			"seq": 2,
			"services": [{
				name: "svc1",
				prop: {},
			}, {
				name: "svc2",
				prop: {}
			}]
		});

		expect(registry.services.getLocalNodeServices).toHaveBeenCalledTimes(1);
		expect(registry.services.getLocalNodeServices).toHaveBeenCalledWith();
	});

});

describe("Test Registry.getLocalNodeInfo", () => {
	let broker = new ServiceBroker({ logger: false, nodeID: "node-1" });
	let registry = broker.registry;
	let localNode = registry.nodes.localNode;
	let rawInfo = { a: 5 };
	localNode.rawInfo = null;

	registry.regenerateLocalRawInfo = jest.fn(() => rawInfo);

	it("should call registry.regenerateLocalRawInfo if no rawInfo", () => {
		expect(registry.getLocalNodeInfo()).toBe(rawInfo);

		expect(registry.regenerateLocalRawInfo).toHaveBeenCalledTimes(1);
		expect(registry.regenerateLocalRawInfo).toHaveBeenCalledWith();
	});

	it("should not call registry.regenerateLocalRawInfo if has rawInfo", () => {
		registry.regenerateLocalRawInfo.mockClear();
		localNode.rawInfo = rawInfo;
		expect(registry.getLocalNodeInfo()).toBe(rawInfo);

		expect(registry.regenerateLocalRawInfo).toHaveBeenCalledTimes(0);
	});

	it("should call registry.regenerateLocalRawInfo if has rawInfo && force", () => {
		registry.regenerateLocalRawInfo.mockClear();
		localNode.rawInfo = rawInfo;
		expect(registry.getLocalNodeInfo(true)).toBe(rawInfo);

		expect(registry.regenerateLocalRawInfo).toHaveBeenCalledTimes(1);
		expect(registry.regenerateLocalRawInfo).toHaveBeenCalledWith();
	});

});

describe("Test Registry.getNodeInfo", () => {
	let broker = new ServiceBroker({ logger: false, nodeID: "node-1" });
	let registry = broker.registry;
	let node = { id: "node-11", rawInfo: { services: [] } };

	registry.nodes.get = jest.fn(() => node);
	registry.getLocalNodeInfo = jest.fn(() => node.rawInfo);

	it("should call registry.nodes.get method and return with rawInfo", () => {
		let res = registry.getNodeInfo("node-11");

		expect(res).toBe(node.rawInfo);

		expect(registry.nodes.get).toHaveBeenCalledTimes(1);
		expect(registry.nodes.get).toHaveBeenCalledWith("node-11");
	});

	it("should call registry.nodes.get method and getLocalNodeInfo", () => {
		registry.nodes.get = jest.fn(() => ({ local: true }));

		let res = registry.getNodeInfo("node-1");

		expect(res).toBe(node.rawInfo);

		expect(registry.nodes.get).toHaveBeenCalledTimes(1);
		expect(registry.nodes.get).toHaveBeenCalledWith("node-1");

		expect(registry.getLocalNodeInfo).toHaveBeenCalledTimes(1);
		expect(registry.getLocalNodeInfo).toHaveBeenCalledWith();
	});

	it("should call registry.nodes.get method and getLocalNodeInfo", () => {
		registry.nodes.get = jest.fn();

		let res = registry.getNodeInfo("node-2");

		expect(res).toBeNull();

		expect(registry.nodes.get).toHaveBeenCalledTimes(1);
		expect(registry.nodes.get).toHaveBeenCalledWith("node-2");
	});
});

describe("Test Registry.processNodeInfo", () => {
	let broker = new ServiceBroker({ logger: false });
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
	let broker = new ServiceBroker({ logger: false });
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
	let broker = new ServiceBroker({ logger: false });
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
	let broker = new ServiceBroker({ logger: false });
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
	let broker = new ServiceBroker({ logger: false });
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
	let broker = new ServiceBroker({ logger: false });
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
	let broker = new ServiceBroker({ logger: false });
	let registry = broker.registry;

	registry.events.list = jest.fn();

	it("should call registry.events.list method", () => {
		let opts = {};
		registry.getEventList(opts);

		expect(registry.events.list).toHaveBeenCalledTimes(1);
		expect(registry.events.list).toHaveBeenCalledWith(opts);
	});
});

describe("Test Registry.getNodeRawList", () => {
	let broker = new ServiceBroker({ logger: false });
	let registry = broker.registry;

	registry.nodes.toArray = jest.fn(() => [
		{ rawInfo: { a: 5 } },
		{ rawInfo: { b: 10 } },
	]);

	it("should call registry.events.list method", () => {
		expect(registry.getNodeRawList()).toEqual([{ a: 5 }, { b: 10 }]);

		expect(registry.nodes.toArray).toHaveBeenCalledTimes(1);
		expect(registry.nodes.toArray).toHaveBeenCalledWith();
	});
});

describe("Test Registry.hasService", () => {
	let broker = new ServiceBroker({ logger: false });
	let registry = broker.registry;

	registry.services.has = jest.fn();

	it("should call registry.services.has method", () => {
		registry.hasService("posts", 2);

		expect(registry.services.has).toHaveBeenCalledTimes(1);
		expect(registry.services.has).toHaveBeenCalledWith("posts", 2, undefined);
	});
});
