"use strict";

let NodeCatalog = require("../../../src/registry/node-catalog");
let ServiceBroker = require("../../../src/service-broker");

describe("Test NodeCatalog constructor", () => {

	it("test properties", () => {
		let broker = new ServiceBroker();
		let registry = broker.registry;

		broker.localBus.on = jest.fn();

		let catalog = new NodeCatalog(registry, broker);

		expect(catalog).toBeDefined();
		expect(catalog.registry).toBe(registry);
		expect(catalog.broker).toBe(broker);
		expect(catalog.logger).toBe(registry.logger);

		expect(catalog.nodes).toBeInstanceOf(Map);
		expect(catalog.heartbeatTimer).toBeNull();
		expect(catalog.checkNodesTimer).toBeNull();
		expect(catalog.offlineTimer).toBeNull();

		expect(catalog.disableHeartbeatChecks).toBe(false);

		expect(catalog.localNode).toBeDefined();
		expect(catalog.localNode.id).toBe(broker.nodeID);
		expect(catalog.nodes.size).toBe(1);

		expect(broker.localBus.on).toHaveBeenCalledTimes(2);
		expect(broker.localBus.on).toHaveBeenCalledWith("$transporter.connected", jasmine.any(Function));
		expect(broker.localBus.on).toHaveBeenCalledWith("$transporter.disconnected", jasmine.any(Function));
	});

	it("should call startHeartbeatTimers & stortHeartbeatTimers", () => {
		let broker = new ServiceBroker();
		let catalog = new NodeCatalog(broker.registry, broker);

		catalog.startHeartbeatTimers = jest.fn();
		catalog.stoptHeartbeatTimers = jest.fn();

		broker.broadcastLocal("$transporter.connected");

		expect(catalog.heartbeatTimer).toBeDefined();
		expect(catalog.checkNodesTimer).toBeDefined();
		expect(catalog.offlineTimer).toBeDefined();

		broker.broadcastLocal("$transporter.disconnected");

		expect(catalog.heartbeatTimer).toBeNull();
		expect(catalog.checkNodesTimer).toBeNull();
		expect(catalog.offlineTimer).toBeNull();
	});

});

describe("Test NodeCatalog localNode", () => {
	let broker = new ServiceBroker();
	let catalog = new NodeCatalog(broker.registry, broker);

	it("should load local values", () => {
		let node = catalog.localNode;

		expect(node.id).toBe(broker.nodeID);
		expect(node.local).toBe(true);
		expect(node.ipList).toBeInstanceOf(Array);
		expect(node.hostname).toBeDefined();
		expect(node.client).toEqual({
			type: "nodejs",
			version: broker.MOLECULER_VERSION,
			langVersion: process.version
		});
		expect(node.when).toBeDefined();
		expect(catalog.nodes.get(broker.nodeID)).toBe(node);
	});

});

describe("Test NodeCatalog.add & has & get", () => {
	let broker = new ServiceBroker();
	let catalog = new NodeCatalog(broker.registry, broker);

	it("should add new nodes", () => {
		catalog.add("node-1", { a: 1 });
		catalog.add("node-2", { a: 2 });
		catalog.add("node-3", { a: 3 });

		expect(catalog.nodes.size).toBe(4);

		expect(catalog.has("node-2")).toBe(true);
		expect(catalog.has("node-3")).toBe(true);
		expect(catalog.has("node-99")).toBe(false);
		expect(catalog.has(broker.nodeID)).toBe(true);

		expect(catalog.get("node-2")).toEqual({ a: 2 });
		expect(catalog.get("node-1")).toEqual({ a: 1 });
		expect(catalog.get(broker.nodeID)).toBe(catalog.localNode);

	});
});

describe("Test NodeCatalog.processNodeInfo", () => {
	let broker = new ServiceBroker();
	let catalog = new NodeCatalog(broker.registry, broker);
	broker.registry.registerServices = jest.fn();
	broker.broadcastLocal = jest.fn();

	it("should add new nodes", () => {
		let payload = {
			sender: "node-12",
			services: [{}, {}],
			when: 123456
		};

		catalog.processNodeInfo(payload);
		expect(catalog.nodes.size).toBe(2);

		let node = catalog.get("node-12");
		expect(node.id).toBe("node-12");

		expect(broker.registry.registerServices).toHaveBeenCalledTimes(1);
		expect(broker.registry.registerServices).toHaveBeenCalledWith(node, payload.services);

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$node.connected", { node, reconnected: false });

		node.update = jest.fn(() => true);
	});

	it("should update exist node", () => {
		broker.registry.registerServices.mockClear();
		broker.broadcastLocal.mockClear();

		let payload = {
			sender: "node-12",
			services: [{}, {}, {}],
			when: 123460
		};

		let node = catalog.get("node-12");

		catalog.processNodeInfo(payload);
		expect(catalog.nodes.size).toBe(2);

		expect(broker.registry.registerServices).toHaveBeenCalledTimes(1);
		expect(broker.registry.registerServices).toHaveBeenCalledWith(node, node.services);

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$node.updated", { node });
	});

	it("should not update node services", () => {
		broker.registry.registerServices.mockClear();
		broker.broadcastLocal.mockClear();

		let node = catalog.get("node-12");
		node.update = jest.fn(() => false);

		let payload = {
			sender: "node-12",
			services: [{}, {}, {}],
			when: 123400
		};

		catalog.processNodeInfo(payload);
		expect(catalog.nodes.size).toBe(2);

		expect(broker.registry.registerServices).toHaveBeenCalledTimes(0);

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$node.updated", { node });

		node.available = false;
	});

	it("should update exist node and send reconnected event", () => {
		broker.registry.registerServices.mockClear();
		broker.broadcastLocal.mockClear();

		let payload = {
			sender: "node-12",
			services: [{}, {}, {}]
		};

		catalog.processNodeInfo(payload);
		expect(catalog.nodes.size).toBe(2);

		let node = catalog.get("node-12");

		expect(broker.registry.registerServices).toHaveBeenCalledTimes(1);
		expect(broker.registry.registerServices).toHaveBeenCalledWith(node, node.services);

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$node.connected", { node, reconnected: true });
	});
});

describe("Test NodeCatalog.disconnected", () => {
	let broker = new ServiceBroker({ transporter: "Fake" });
	let catalog = new NodeCatalog(broker.registry, broker);
	broker.registry.unregisterServicesByNode = jest.fn();
	broker.broadcastLocal = jest.fn();
	broker.transit.removePendingRequestByNodeID = jest.fn();
	broker.servicesChanged = jest.fn();

	let payload = {
		sender: "node-11",
		services: [{}, {}]
	};

	catalog.processNodeInfo(payload);
	let node = catalog.get("node-11");
	node.disconnected = jest.fn();

	it("should call disconnected & unregister services", () => {
		broker.broadcastLocal.mockClear();
		broker.registry.unregisterServicesByNode.mockClear();

		catalog.disconnected("node-11", false);

		expect(node.disconnected).toHaveBeenCalledTimes(1);
		expect(node.disconnected).toHaveBeenCalledWith(false);

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$node.disconnected", { node, unexpected: false });

		expect(broker.servicesChanged).toHaveBeenCalledTimes(1);
		expect(broker.servicesChanged).toHaveBeenCalledWith(false);

		expect(broker.transit.removePendingRequestByNodeID).toHaveBeenCalledTimes(1);
		expect(broker.transit.removePendingRequestByNodeID).toHaveBeenCalledWith("node-11");

		expect(broker.registry.unregisterServicesByNode).toHaveBeenCalledTimes(1);
		expect(broker.registry.unregisterServicesByNode).toHaveBeenCalledWith(node.id);
	});

	it("should call disconnected & unregister services (unexpected", () => {
		broker.broadcastLocal.mockClear();
		broker.registry.unregisterServicesByNode.mockClear();
		node.disconnected.mockClear();
		broker.servicesChanged.mockClear();

		catalog.disconnected("node-11", true);

		expect(node.disconnected).toHaveBeenCalledTimes(1);
		expect(node.disconnected).toHaveBeenCalledWith(true);

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$node.disconnected", { node, unexpected: true });

		expect(broker.servicesChanged).toHaveBeenCalledTimes(1);
		expect(broker.servicesChanged).toHaveBeenCalledWith(false);

		expect(broker.registry.unregisterServicesByNode).toHaveBeenCalledTimes(1);
		expect(broker.registry.unregisterServicesByNode).toHaveBeenCalledWith(node.id);
	});
});

describe("Test NodeCatalog.heartbeat", () => {
	let broker = new ServiceBroker({ transporter: "fake" });
	let catalog = new NodeCatalog(broker.registry, broker);
	broker.transit.discoverNode = jest.fn();

	let payload = {
		sender: "node-10",
		services: []
	};

	catalog.processNodeInfo(payload);
	let node = catalog.get("node-10");
	node.heartbeat = jest.fn();
	let hbPayload = { sender: "node-10" };

	it("should call heartbeat", () => {
		node.heartbeat.mockClear();

		catalog.heartbeat(hbPayload);

		expect(node.heartbeat).toHaveBeenCalledTimes(1);
		expect(node.heartbeat).toHaveBeenCalledWith(hbPayload);

		expect(broker.transit.discoverNode).toHaveBeenCalledTimes(0);
	});

	it("should call heartbeat & transit.discoverNode", () => {
		node.heartbeat.mockClear();
		node.available = false;

		catalog.heartbeat(hbPayload);

		expect(node.heartbeat).toHaveBeenCalledTimes(0);

		expect(broker.transit.discoverNode).toHaveBeenCalledTimes(1);
		expect(broker.transit.discoverNode).toHaveBeenCalledWith("node-10");
	});

	it("should call heartbeat & transit.discoverNode", () => {
		node.heartbeat.mockClear();
		broker.transit.discoverNode.mockClear();

		let newPayload = { sender: "node-15"};
		catalog.heartbeat(newPayload);

		expect(node.heartbeat).toHaveBeenCalledTimes(0);

		expect(broker.transit.discoverNode).toHaveBeenCalledTimes(1);
		expect(broker.transit.discoverNode).toHaveBeenCalledWith("node-15");
	});

});

describe("Test checkRemoteNodes", () => {
	let broker = new ServiceBroker({ transporter: "fake" });
	let catalog = new NodeCatalog(broker.registry, broker);

	let payload = {
		sender: "node-10",
		services: []
	};

	catalog.processNodeInfo(payload);
	let node = catalog.get("node-10");

	catalog.disconnected = jest.fn();

	it("should call 'disconnected' if the heartbeat time is too old", () => {
		node.lastHeartbeatTime = Date.now();
		catalog.checkRemoteNodes();
		expect(catalog.disconnected).toHaveBeenCalledTimes(0);

		node.lastHeartbeatTime -= broker.options.heartbeatTimeout * 1.5 * 1000;
		catalog.checkRemoteNodes();

		expect(catalog.disconnected).toHaveBeenCalledTimes(1);
		expect(catalog.disconnected).toHaveBeenCalledWith("node-10", true);
	});

	it("should not call 'disconnected' if the node is local", () => {
		catalog.disconnected.mockClear();
		node.local = true;
		catalog.checkRemoteNodes();
		expect(catalog.disconnected).toHaveBeenCalledTimes(0);
		node.local = false;
	});

	it("should not call 'disconnected' if the node is not available", () => {
		catalog.disconnected.mockClear();
		node.available = false;
		catalog.checkRemoteNodes();
		expect(catalog.disconnected).toHaveBeenCalledTimes(0);
		node.available = true;
	});

});

describe("Test checkOfflineNodes", () => {
	let broker = new ServiceBroker({ transporter: "fake" });
	let catalog = new NodeCatalog(broker.registry, broker);

	let payload1 = {
		sender: "node-1",
		services: []
	};

	let payload2 = {
		sender: "node-2",
		services: []
	};

	catalog.processNodeInfo(payload1);
	catalog.processNodeInfo(payload2);

	let node1 = catalog.get("node-1");
	let node2 = catalog.get("node-2");

	it("should not remove available nodes", () => {
		catalog.checkOfflineNodes();
		expect(catalog.nodes.size).toBe(3);

		node2.lastHeartbeatTime -= 4 * 60 * 1000;
		catalog.checkOfflineNodes();
		expect(catalog.nodes.size).toBe(3);
	});

	it("should not remove local node", () => {
		expect(catalog.nodes.size).toBe(3);
		node1.local = true;
		catalog.checkOfflineNodes();
		expect(catalog.nodes.size).toBe(3);
		node1.local = false;
	});

	it("should remove old offline nodes", () => {
		node1.lastHeartbeatTime = Date.now();
		node2.lastHeartbeatTime = Date.now();

		catalog.checkOfflineNodes();
		expect(catalog.nodes.size).toBe(3);

		node2.available = false;
		node2.lastHeartbeatTime -= 4 * 60 * 1000;
		catalog.checkOfflineNodes();

		expect(catalog.nodes.size).toBe(2);

		node1.available = false;
		node1.lastHeartbeatTime -= 4 * 60 * 1000;
		catalog.checkOfflineNodes();

		expect(catalog.nodes.size).toBe(1);
	});

});

describe("Test NodeCatalog.list", () => {
	let broker = new ServiceBroker({ transporter: "fake" });
	let catalog = new NodeCatalog(broker.registry, broker);
	broker.transit.discoverNode = jest.fn();

	let payload = {
		sender: "node-10",
		services: []
	};

	catalog.processNodeInfo(payload);

	it("should return with node list", () => {
		let res = catalog.list();
		expect(res).toEqual([
			{
				"available": true,
				"client": catalog.localNode.client,
				"config": {},
				"cpu": null,
				"cpuWhen": null,
				"id": broker.nodeID,
				"ipList": catalog.localNode.ipList,
				"hostname": catalog.localNode.hostname,
				"port": null,
				"lastHeartbeatTime": jasmine.any(Number),
				"offlineSince": null,
				"when": jasmine.any(Number),
				"local": true
			},
			{
				"available": true,
				"client": {},
				"config": {},
				"cpu": null,
				"cpuWhen": null,
				"id": "node-10",
				"ipList": undefined,
				"hostname": undefined,
				"port": undefined,
				"lastHeartbeatTime": jasmine.any(Number),
				"offlineSince": null,
				"when": jasmine.any(Number),
				"local": false,
			}
		]);

	});

	it("should return node list with services", () => {
		let res = catalog.list(true);
		expect(res).toEqual([
			{
				"available": true,
				"client": catalog.localNode.client,
				"config": {},
				"cpu": null,
				"cpuWhen": null,
				"id": broker.nodeID,
				"ipList": catalog.localNode.ipList,
				"hostname": catalog.localNode.hostname,
				"port": null,
				"lastHeartbeatTime": jasmine.any(Number),
				"local": true,
				"offlineSince": null,
				"when": jasmine.any(Number),
				"services": []
			},
			{
				"available": true,
				"client": {},
				"config": {},
				"cpu": null,
				"cpuWhen": null,
				"id": "node-10",
				"ipList": undefined,
				"hostname": undefined,
				"port": undefined,
				"lastHeartbeatTime": jasmine.any(Number),
				"local": false,
				"offlineSince": null,
				"when": jasmine.any(Number),
				"services": []
			}
		]);

	});
});
