"use strict";

const NodeCatalog = require("../../../src/registry/node-catalog");
const ServiceBroker = require("../../../src/service-broker");

describe("Test NodeCatalog constructor", () => {

	it("test properties", () => {
		const broker = new ServiceBroker({ logger: false });
		const registry = broker.registry;

		broker.localBus.on = jest.fn();

		const catalog = new NodeCatalog(registry, broker);

		expect(catalog).toBeDefined();
		expect(catalog.registry).toBe(registry);
		expect(catalog.broker).toBe(broker);
		expect(catalog.logger).toBe(registry.logger);

		expect(catalog.nodes).toBeInstanceOf(Map);

		expect(catalog.localNode).toBeDefined();
		expect(catalog.localNode.id).toBe(broker.nodeID);
		expect(catalog.localNode.available).toBe(true);
		expect(catalog.nodes.size).toBe(1);
	});

});

describe("Test NodeCatalog localNode", () => {
	const metadata = { region: "eu-west" };
	const broker = new ServiceBroker({ logger: false, metadata });
	const catalog = new NodeCatalog(broker.registry, broker);

	it("should load local values", () => {
		const node = catalog.localNode;

		expect(node.id).toBe(broker.nodeID);
		expect(node.instanceID).toBe(broker.instanceID);
		expect(node.local).toBe(true);
		expect(node.ipList).toBeInstanceOf(Array);
		expect(node.hostname).toBeDefined();
		expect(node.client).toEqual({
			type: "nodejs",
			version: broker.MOLECULER_VERSION,
			langVersion: process.version
		});
		expect(node.seq).toBe(1);
		expect(node.metadata).toBe(metadata);
		expect(catalog.nodes.get(broker.nodeID)).toBe(node);
	});

});

describe("Test NodeCatalog.add & has & get", () => {
	const broker = new ServiceBroker({ logger: false });
	const catalog = new NodeCatalog(broker.registry, broker);

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
	const broker = new ServiceBroker({ logger: false });
	const catalog = new NodeCatalog(broker.registry, broker);
	broker.registry.registerServices = jest.fn();
	broker.broadcastLocal = jest.fn();
	jest.spyOn(broker.registry, "updateMetrics");

	it("should add new nodes", () => {
		const payload = {
			sender: "node-12",
			services: [{}, {}]
		};

		expect(catalog.count()).toBe(1);
		expect(catalog.onlineCount()).toBe(1);

		catalog.processNodeInfo(payload);

		expect(catalog.nodes.size).toBe(2);
		expect(catalog.count()).toBe(2);
		expect(catalog.onlineCount()).toBe(2);

		const node = catalog.get("node-12");
		expect(node.id).toBe("node-12");

		expect(broker.registry.registerServices).toHaveBeenCalledTimes(1);
		expect(broker.registry.registerServices).toHaveBeenCalledWith(node, payload.services);

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$node.connected", { node, reconnected: false });

		expect(broker.registry.updateMetrics).toHaveBeenCalledTimes(1);

		node.update = jest.fn(() => true);
	});

	it("should update exist node", () => {
		broker.registry.registerServices.mockClear();
		broker.broadcastLocal.mockClear();
		broker.registry.updateMetrics.mockClear();

		const payload = {
			sender: "node-12",
			services: [{}, {}, {}]
		};

		const node = catalog.get("node-12");

		catalog.processNodeInfo(payload);
		expect(catalog.nodes.size).toBe(2);

		expect(broker.registry.registerServices).toHaveBeenCalledTimes(1);
		expect(broker.registry.registerServices).toHaveBeenCalledWith(node, node.services);

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$node.updated", { node });

		expect(broker.registry.updateMetrics).toHaveBeenCalledTimes(0);
	});

	it("should not update node services", () => {
		broker.registry.registerServices.mockClear();
		broker.broadcastLocal.mockClear();
		broker.registry.updateMetrics.mockClear();

		const node = catalog.get("node-12");
		node.update = jest.fn(() => false);

		const payload = {
			sender: "node-12",
			services: [{}, {}, {}]
		};

		catalog.processNodeInfo(payload);
		expect(catalog.nodes.size).toBe(2);

		expect(broker.registry.registerServices).toHaveBeenCalledTimes(0);

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$node.updated", { node });

		expect(broker.registry.updateMetrics).toHaveBeenCalledTimes(0);

		node.available = false;
	});

	it("should update exist node and send reconnected event", () => {
		broker.registry.registerServices.mockClear();
		broker.broadcastLocal.mockClear();
		broker.registry.updateMetrics.mockClear();

		const node = catalog.get("node-12");
		node.update = jest.fn(() => true);

		const payload = {
			sender: "node-12",
			services: [{}, {}, {}]
		};

		catalog.processNodeInfo(payload);
		expect(catalog.nodes.size).toBe(2);

		expect(broker.registry.registerServices).toHaveBeenCalledTimes(1);
		expect(broker.registry.registerServices).toHaveBeenCalledWith(node, node.services);

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$node.connected", { node, reconnected: true });

		expect(broker.registry.updateMetrics).toHaveBeenCalledTimes(1);
	});
});

describe("Test NodeCatalog.disconnected", () => {
	const broker = new ServiceBroker({ logger: false, transporter: "Fake" });
	const catalog = new NodeCatalog(broker.registry, broker);
	catalog.logger = {
		info: jest.fn(),
		warn: jest.fn(),
	};
	broker.registry.unregisterServicesByNode = jest.fn();
	broker.broadcastLocal = jest.fn();
	broker.transit.removePendingRequestByNodeID = jest.fn();
	broker.servicesChanged = jest.fn();
	jest.spyOn(broker.registry, "updateMetrics");

	const payload = {
		sender: "node-11",
		services: [{}, {}]
	};

	catalog.processNodeInfo(payload);
	const node = catalog.get("node-11");
	node.disconnected = jest.fn();

	beforeEach(() => {
		catalog.logger.info.mockClear();
		catalog.logger.warn.mockClear();
	});

	it("should call disconnected & unregister services", () => {
		broker.broadcastLocal.mockClear();
		broker.registry.unregisterServicesByNode.mockClear();
		broker.registry.updateMetrics.mockClear();

		catalog.disconnected("node-11", false);

		expect(node.disconnected).toHaveBeenCalledTimes(1);
		expect(node.disconnected).toHaveBeenCalledWith(false);

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$node.disconnected", { node, unexpected: false });

		expect(broker.registry.updateMetrics).toHaveBeenCalledTimes(1);

		expect(broker.servicesChanged).toHaveBeenCalledTimes(1);
		expect(broker.servicesChanged).toHaveBeenCalledWith(false);

		expect(broker.transit.removePendingRequestByNodeID).toHaveBeenCalledTimes(1);
		expect(broker.transit.removePendingRequestByNodeID).toHaveBeenCalledWith("node-11");

		expect(broker.registry.unregisterServicesByNode).toHaveBeenCalledTimes(1);
		expect(broker.registry.unregisterServicesByNode).toHaveBeenCalledWith(node.id);

		expect(catalog.logger.info).toHaveBeenCalledTimes(1);
		expect(catalog.logger.info).toHaveBeenCalledWith("Node 'node-11' disconnected.");
		expect(catalog.logger.warn).toHaveBeenCalledTimes(0);
	});

	it("should call disconnected & unregister services (unexpected)", () => {
		broker.broadcastLocal.mockClear();
		broker.registry.unregisterServicesByNode.mockClear();
		node.disconnected.mockClear();
		broker.servicesChanged.mockClear();
		broker.registry.updateMetrics.mockClear();

		catalog.disconnected("node-11", true);

		expect(node.disconnected).toHaveBeenCalledTimes(1);
		expect(node.disconnected).toHaveBeenCalledWith(true);

		expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
		expect(broker.broadcastLocal).toHaveBeenCalledWith("$node.disconnected", { node, unexpected: true });

		expect(broker.registry.updateMetrics).toHaveBeenCalledTimes(1);

		// expect(broker.servicesChanged).toHaveBeenCalledTimes(1);
		// expect(broker.servicesChanged).toHaveBeenCalledWith(false);

		expect(broker.registry.unregisterServicesByNode).toHaveBeenCalledTimes(1);
		expect(broker.registry.unregisterServicesByNode).toHaveBeenCalledWith(node.id);

		expect(catalog.logger.info).toHaveBeenCalledTimes(0);
		expect(catalog.logger.warn).toHaveBeenCalledTimes(1);
		expect(catalog.logger.warn).toHaveBeenCalledWith("Node 'node-11' disconnected unexpectedly.");
	});
});


describe("Test NodeCatalog.list", () => {
	const broker = new ServiceBroker({ logger: false, transporter: "fake", metadata: { a: 5 } });
	const catalog = new NodeCatalog(broker.registry, broker);
	broker.transit.discoverNode = jest.fn();

	const payload = {
		sender: "node-10",
		services: []
	};

	catalog.processNodeInfo(payload);

	it("should return with node list", () => {
		const res = catalog.list({});
		expect(res).toEqual([
			{
				"available": true,
				"client": catalog.localNode.client,
				"config": {},
				"cpu": null,
				"cpuSeq": null,
				"id": broker.nodeID,
				"instanceID": broker.instanceID,
				"ipList": catalog.localNode.ipList,
				"hostname": catalog.localNode.hostname,
				"port": null,
				"lastHeartbeatTime": jasmine.any(Number),
				"offlineSince": null,
				"seq": 1,
				"local": true,
				"metadata": { a: 5 },
				"udpAddress": null
			},
			{
				"available": true,
				"client": {},
				"config": {},
				"cpu": null,
				"cpuSeq": null,
				"id": "node-10",
				"instanceID": undefined,
				"ipList": undefined,
				"hostname": undefined,
				"port": undefined,
				"lastHeartbeatTime": jasmine.any(Number),
				"offlineSince": null,
				"seq": 1,
				"local": false,
				"metadata": undefined,
				"udpAddress": null
			}
		]);

	});

	it("should return node list with services", () => {
		const res = catalog.list({ withServices: true });
		expect(res).toEqual([
			{
				"available": true,
				"client": catalog.localNode.client,
				"config": {},
				"cpu": null,
				"cpuSeq": null,
				"id": broker.nodeID,
				"instanceID": broker.instanceID,
				"ipList": catalog.localNode.ipList,
				"hostname": catalog.localNode.hostname,
				"port": null,
				"lastHeartbeatTime": jasmine.any(Number),
				"local": true,
				"offlineSince": null,
				"seq": 1,
				"services": [],
				"metadata": { a: 5 },
				"udpAddress": null
			},
			{
				"available": true,
				"client": {},
				"config": {},
				"cpu": null,
				"cpuSeq": null,
				"id": "node-10",
				"instanceID": undefined,
				"ipList": undefined,
				"hostname": undefined,
				"port": undefined,
				"lastHeartbeatTime": jasmine.any(Number),
				"local": false,
				"offlineSince": null,
				"seq": 1,
				"services": [],
				"metadata": undefined,
				"udpAddress": null
			}
		]);

	});

	it("should return node list with services", () => {
		catalog.disconnected("node-10");
		const res = catalog.list({ onlyAvailable: true });
		expect(res).toEqual([
			{
				"available": true,
				"client": catalog.localNode.client,
				"config": {},
				"cpu": null,
				"cpuSeq": null,
				"id": broker.nodeID,
				"instanceID": broker.instanceID,
				"ipList": catalog.localNode.ipList,
				"hostname": catalog.localNode.hostname,
				"port": null,
				"lastHeartbeatTime": jasmine.any(Number),
				"local": true,
				"offlineSince": null,
				"seq": 1,
				"metadata": { a: 5 },
				"udpAddress": null
			}
		]);

	});
});

describe("Test NodeCatalog.toArray", () => {
	const broker = new ServiceBroker({ logger: false, nodeID: "node-1", transporter: "fake" });
	const catalog = new NodeCatalog(broker.registry, broker);
	broker.transit.discoverNode = jest.fn();

	const payload = {
		sender: "node-10",
		services: []
	};

	catalog.processNodeInfo(payload);

	it("should return with node list array", () => {
		const res = catalog.toArray();
		expect(res).toEqual([
			catalog.nodes.get("node-1"),
			catalog.nodes.get("node-10"),
		]);

	});
});
