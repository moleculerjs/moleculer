"use strict";

const BaseDiscoverer = require("../../../../src/registry/discoverers").Base;
const ServiceBroker = require("../../../../src/service-broker");

describe("Test BaseDiscoverer constructor", () => {

	const broker = new ServiceBroker({ logger: false });
	const registry = broker.registry;

	it("test constructor without opts", () => {
		const discoverer = new BaseDiscoverer();

		expect(discoverer).toBeDefined();
		expect(discoverer.opts).toEqual({
			heartbeatInterval: null,
			heartbeatTimeout: null,

			disableHeartbeatChecks: false,
			disableOfflineNodeRemoving: false,
			cleanOfflineNodesTimeout: 600
		});

		expect(discoverer.heartbeatTimer).toBeNull();
		expect(discoverer.checkNodesTimer).toBeNull();
		expect(discoverer.offlineTimer).toBeNull();

		expect(discoverer.localNode).toBeNull();
	});

	it("test constructor with opts", () => {
		const discoverer = new BaseDiscoverer({
			heartbeatInterval: 5,

			disableOfflineNodeRemoving: true,
			cleanOfflineNodesTimeout: 10000
		});

		expect(discoverer).toBeDefined();
		expect(discoverer.opts).toEqual({
			heartbeatInterval: 5,
			heartbeatTimeout: null,

			disableHeartbeatChecks: false,
			disableOfflineNodeRemoving: true,
			cleanOfflineNodesTimeout: 10000
		});

		expect(discoverer.heartbeatTimer).toBeNull();
		expect(discoverer.checkNodesTimer).toBeNull();
		expect(discoverer.offlineTimer).toBeNull();

		expect(discoverer.localNode).toBeNull();
	});

});

describe("Test BaseDiscoverer 'init' method", () => {

	it("init without opts & transit", () => {
		const broker = new ServiceBroker({ logger: false });
		const registry = broker.registry;

		jest.spyOn(broker, "getLogger");

		const discoverer = new BaseDiscoverer();

		discoverer.registerMoleculerMetrics = jest.fn();

		discoverer.init(registry);

		expect(discoverer.logger).toBeDefined();
		expect(broker.getLogger).toBeCalledTimes(1);
		expect(broker.getLogger).toBeCalledWith("Discovery");
		expect(discoverer.transit).toBeUndefined();

		expect(discoverer.opts).toEqual({
			heartbeatInterval: 10,
			heartbeatTimeout: 30,

			disableHeartbeatChecks: false,
			disableOfflineNodeRemoving: false,
			cleanOfflineNodesTimeout: 600
		});

		expect(discoverer.localNode).toBe(registry.nodes.localNode);

		expect(discoverer.registerMoleculerMetrics).toBeCalledTimes(1);
		expect(discoverer.registerMoleculerMetrics).toBeCalledWith();
	});

	it("init with opts & transit", () => {
		const broker = new ServiceBroker({ logger: false, transporter: "Fake", heartbeatInterval: 10, heartbeatTimeout: 50 });
		const registry = broker.registry;

		const discoverer = new BaseDiscoverer({
			heartbeatInterval: 20,
			heartbeatTimeout: 40
		});

		const eventsCB = {};
		broker.localBus.on = jest.fn((name, cb) => eventsCB[name] = cb);
		discoverer.startHeartbeatTimers = jest.fn();
		discoverer.stopHeartbeatTimers = jest.fn();

		discoverer.init(registry);

		expect(discoverer.transit).toBe(broker.transit);

		expect(discoverer.opts).toEqual({
			heartbeatInterval: 20,
			heartbeatTimeout: 40,

			disableHeartbeatChecks: false,
			disableOfflineNodeRemoving: false,
			cleanOfflineNodesTimeout: 600
		});

		expect(broker.localBus.on).toBeCalledTimes(2);
		expect(broker.localBus.on).toBeCalledWith("$transporter.connected", expect.any(Function));
		expect(broker.localBus.on).toBeCalledWith("$transporter.disconnected", expect.any(Function));

		// Test event handlers
		expect(discoverer.startHeartbeatTimers).toBeCalledTimes(0);
		eventsCB["$transporter.connected"]();
		expect(discoverer.startHeartbeatTimers).toBeCalledTimes(1);

		expect(discoverer.stopHeartbeatTimers).toBeCalledTimes(0);
		eventsCB["$transporter.disconnected"]();
		expect(discoverer.stopHeartbeatTimers).toBeCalledTimes(1);
	});
});

describe("Test BaseDiscoverer 'stop' method", () => {

	it("should stop timers", async () => {
		const broker = new ServiceBroker({ logger: false });
		const registry = broker.registry;

		const discoverer = new BaseDiscoverer();

		discoverer.stopHeartbeatTimers = jest.fn();

		discoverer.init(registry);
		await discoverer.stop();

		expect(discoverer.stopHeartbeatTimers).toBeCalledTimes(1);
		expect(discoverer.stopHeartbeatTimers).toBeCalledWith();
	});


	it("should do nothing if no init", async () => {
		const broker = new ServiceBroker({ logger: false });
		const registry = broker.registry;

		const discoverer = new BaseDiscoverer();

		await discoverer.stop();
	});
});

describe("Test BaseDiscoverer 'startHeartbeatTimers' method", () => {

	const broker = new ServiceBroker({ logger: false });
	const registry = broker.registry;

	const discoverer = new BaseDiscoverer();
	beforeAll(() => discoverer.init(registry));
	afterAll(() => discoverer.stop());

	it("should create timers", async () => {
		jest.useFakeTimers();

		discoverer.beat = jest.fn();
		discoverer.checkRemoteNodes = jest.fn();
		discoverer.checkOfflineNodes = jest.fn();

		discoverer.startHeartbeatTimers();

		expect(discoverer.heartbeatTimer).toBeDefined();
		expect(discoverer.checkNodesTimer).toBeDefined();
		expect(discoverer.offlineTimer).toBeDefined();

		expect(discoverer.beat).toBeCalledTimes(0);
		jest.advanceTimersByTime(12000);
		expect(discoverer.beat).toBeCalledTimes(1);

		expect(discoverer.checkRemoteNodes).toBeCalledTimes(0);
		jest.advanceTimersByTime(20000);
		expect(discoverer.checkRemoteNodes).toBeCalledTimes(1);

		expect(discoverer.checkOfflineNodes).toBeCalledTimes(0);
		jest.advanceTimersByTime(30000);
		expect(discoverer.checkOfflineNodes).toBeCalledTimes(1);

	});
});

describe("Test BaseDiscoverer 'stopHeartbeatTimers' method", () => {

	const broker = new ServiceBroker({ logger: false });
	const registry = broker.registry;

	const discoverer = new BaseDiscoverer();
	beforeAll(() => discoverer.init(registry));
	afterAll(() => discoverer.stop());

	it("should stop timers", async () => {
		jest.useFakeTimers();

		discoverer.beat = jest.fn();
		discoverer.checkRemoteNodes = jest.fn();
		discoverer.checkOfflineNodes = jest.fn();

		discoverer.startHeartbeatTimers();

		expect(discoverer.heartbeatTimer).toBeDefined();
		expect(discoverer.checkNodesTimer).toBeDefined();
		expect(discoverer.offlineTimer).toBeDefined();

		discoverer.stopHeartbeatTimers();

		expect(discoverer.heartbeatTimer).toBeNull();
		expect(discoverer.checkNodesTimer).toBeNull();
		expect(discoverer.offlineTimer).toBeNull();

		jest.advanceTimersByTime(35000);

		expect(discoverer.beat).toBeCalledTimes(0);
		expect(discoverer.checkRemoteNodes).toBeCalledTimes(0);
		expect(discoverer.checkOfflineNodes).toBeCalledTimes(0);
	});
});

describe("Test BaseDiscoverer 'disableHeartbeat' method", () => {

	const broker = new ServiceBroker({ logger: false });
	const registry = broker.registry;

	const discoverer = new BaseDiscoverer();
	beforeAll(() => discoverer.init(registry));
	afterAll(() => discoverer.stop());

	it("should stop timers", async () => {
		discoverer.stopHeartbeatTimers = jest.fn();
		expect(discoverer.opts.heartbeatInterval).toBe(10);

		discoverer.disableHeartbeat();

		expect(discoverer.opts.heartbeatInterval).toBe(0);
		expect(discoverer.stopHeartbeatTimers).toBeCalledTimes(1);
	});
});

describe("Test BaseDiscoverer 'beat' method", () => {

	const broker = new ServiceBroker({ logger: false });
	const registry = broker.registry;

	const discoverer = new BaseDiscoverer();

	beforeAll(() => discoverer.init(registry));
	afterAll(() => discoverer.stop());

	it("should update local node & call sendHeartbeat", async () => {

		discoverer.sendHeartbeat = jest.fn();
		discoverer.localNode.updateLocalInfo = jest.fn(() => Promise.resolve());

		await discoverer.beat();

		expect(discoverer.localNode.updateLocalInfo).toBeCalledTimes(1);
		expect(discoverer.localNode.updateLocalInfo).toBeCalledWith(broker.getCpuUsage);

		expect(discoverer.sendHeartbeat).toBeCalledTimes(1);
		expect(discoverer.sendHeartbeat).toBeCalledWith();
	});
});

describe("Test BaseDiscoverer 'checkRemoteNodes' method", () => {

	const broker = new ServiceBroker({ logger: false });
	const registry = broker.registry;

	const discoverer = new BaseDiscoverer({ heartbeatTimeout: 10 });

	const node = { id: "node-10", local: false, available: true };
	registry.nodes.toArray = jest.fn(() => [node]);
	registry.nodes.disconnected = jest.fn();


	beforeAll(() => {
		discoverer.init(registry);
		jest.spyOn(discoverer.logger, "warn");
	});
	afterAll(() => discoverer.stop());

	it("should set lastHeartbeatTime", async () => {
		discoverer.logger.warn.mockClear();
		registry.nodes.disconnected.mockClear();

		discoverer.checkRemoteNodes();

		expect(registry.nodes.disconnected).toBeCalledTimes(0);
		expect(discoverer.logger.warn).toBeCalledTimes(0);

		expect(node.lastHeartbeatTime).toBeDefined();
	});

	it("should call disconnected if available", async () => {
		discoverer.logger.warn.mockClear();
		registry.nodes.disconnected.mockClear();

		node.lastHeartbeatTime = Number(process.uptime()) - 33;

		discoverer.checkRemoteNodes();

		expect(registry.nodes.disconnected).toBeCalledTimes(1);
		expect(registry.nodes.disconnected).toBeCalledWith("node-10", true);
		expect(discoverer.logger.warn).toBeCalledTimes(1);
	});

	it("should not call disconnected if time between", async () => {
		discoverer.logger.warn.mockClear();
		registry.nodes.disconnected.mockClear();

		node.lastHeartbeatTime = Number(process.uptime()) - 23;

		discoverer.checkRemoteNodes();

		expect(registry.nodes.disconnected).toBeCalledTimes(0);
		expect(discoverer.logger.warn).toBeCalledTimes(0);
	});

	it("should not call disconnected if not available", async () => {
		discoverer.logger.warn.mockClear();
		registry.nodes.disconnected.mockClear();

		node.lastHeartbeatTime = Number(process.uptime()) - 33;
		node.available = false;

		discoverer.checkRemoteNodes();

		expect(registry.nodes.disconnected).toBeCalledTimes(0);
		expect(discoverer.logger.warn).toBeCalledTimes(0);
	});

	it("should not call disconnected if local", async () => {
		discoverer.logger.warn.mockClear();
		registry.nodes.disconnected.mockClear();

		node.available = true;
		node.local = true;

		discoverer.checkRemoteNodes();

		expect(registry.nodes.disconnected).toBeCalledTimes(0);
		expect(discoverer.logger.warn).toBeCalledTimes(0);
	});

	it("should not call disconnected if disabled", async () => {
		discoverer.logger.warn.mockClear();
		registry.nodes.disconnected.mockClear();

		discoverer.opts.disableHeartbeatChecks = true;
		node.local = false;

		discoverer.checkRemoteNodes();

		expect(registry.nodes.disconnected).toBeCalledTimes(0);
		expect(discoverer.logger.warn).toBeCalledTimes(0);
	});

});

describe("Test BaseDiscoverer 'checkOfflineNodes' method", () => {

	const broker = new ServiceBroker({ logger: false });
	const registry = broker.registry;

	const discoverer = new BaseDiscoverer({ cleanOfflineNodesTimeout: 30 });

	const node = { id: "node-10", local: false, available: false };
	registry.nodes.toArray = jest.fn(() => [node]);
	registry.nodes.delete = jest.fn();

	beforeAll(() => {
		discoverer.init(registry);
		jest.spyOn(discoverer.logger, "warn");
	});
	afterAll(() => discoverer.stop());

	it("should set lastHeartbeatTime", async () => {
		discoverer.logger.warn.mockClear();
		registry.nodes.delete.mockClear();

		discoverer.checkOfflineNodes();

		expect(registry.nodes.delete).toBeCalledTimes(0);
		expect(discoverer.logger.warn).toBeCalledTimes(0);

		expect(node.lastHeartbeatTime).toBeDefined();
	});

	it("should call delete if not available", async () => {
		discoverer.logger.warn.mockClear();
		registry.nodes.delete.mockClear();

		node.lastHeartbeatTime = Number(process.uptime()) - 31;

		discoverer.checkOfflineNodes();

		expect(registry.nodes.delete).toBeCalledTimes(1);
		expect(registry.nodes.delete).toBeCalledWith("node-10");
		expect(discoverer.logger.warn).toBeCalledTimes(1);
	});

	it("should not call delete if time between", async () => {
		discoverer.logger.warn.mockClear();
		registry.nodes.delete.mockClear();

		node.lastHeartbeatTime = Number(process.uptime()) - 28;

		discoverer.checkOfflineNodes();

		expect(registry.nodes.delete).toBeCalledTimes(0);
		expect(discoverer.logger.warn).toBeCalledTimes(0);
	});

	it("should not call delete if available", async () => {
		discoverer.logger.warn.mockClear();
		registry.nodes.delete.mockClear();

		node.lastHeartbeatTime = Number(process.uptime()) - 31;
		node.available = true;

		discoverer.checkOfflineNodes();

		expect(registry.nodes.delete).toBeCalledTimes(0);
		expect(discoverer.logger.warn).toBeCalledTimes(0);
	});

	it("should not call delete if local", async () => {
		discoverer.logger.warn.mockClear();
		registry.nodes.delete.mockClear();

		node.available = false;
		node.local = true;

		discoverer.checkOfflineNodes();

		expect(registry.nodes.delete).toBeCalledTimes(0);
		expect(discoverer.logger.warn).toBeCalledTimes(0);
	});

	it("should not call delete if disabled", async () => {
		discoverer.logger.warn.mockClear();
		registry.nodes.delete.mockClear();

		discoverer.opts.disableOfflineNodeRemoving = true;
		node.local = false;

		discoverer.checkOfflineNodes();

		expect(registry.nodes.delete).toBeCalledTimes(0);
		expect(discoverer.logger.warn).toBeCalledTimes(0);
	});

});

describe("Test BaseDiscoverer 'heartbeatReceived' method", () => {

	const broker = new ServiceBroker({ logger: false });
	const registry = broker.registry;

	const discoverer = new BaseDiscoverer();

	const node = {
		id: "node-10",
		instanceID: "iid-1",
		seq: 2,
		local: false,
		available: false,
		heartbeat: jest.fn()
	};

	registry.nodes.get = jest.fn(() => node);
	discoverer.discoverNode = jest.fn();

	beforeAll(() => discoverer.init(registry));
	afterAll(() => discoverer.stop());

	it("should call discoverNode if unknown", async () => {
		discoverer.discoverNode.mockClear();
		registry.nodes.get.mockClear();
		node.heartbeat.mockClear();

		discoverer.heartbeatReceived("node-9", {});

		expect(registry.nodes.get).toBeCalledTimes(1);
		expect(registry.nodes.get).toBeCalledWith("node-9");

		expect(discoverer.discoverNode).toBeCalledTimes(1);
		expect(discoverer.discoverNode).toBeCalledWith("node-9");

		expect(node.heartbeat).toBeCalledTimes(0);
	});

	it("should call discoverNode if node is not available", async () => {
		discoverer.discoverNode.mockClear();
		registry.nodes.get.mockClear();
		node.heartbeat.mockClear();
		node.available = false;

		discoverer.heartbeatReceived("node-10", {});

		expect(discoverer.discoverNode).toBeCalledTimes(1);
		expect(discoverer.discoverNode).toBeCalledWith("node-10");

		expect(node.heartbeat).toBeCalledTimes(0);
	});

	it("should call discoverNode if seq is different", async () => {
		discoverer.discoverNode.mockClear();
		registry.nodes.get.mockClear();
		node.heartbeat.mockClear();

		node.available = true;

		discoverer.heartbeatReceived("node-10", { seq: 3 });

		expect(discoverer.discoverNode).toBeCalledTimes(1);
		expect(discoverer.discoverNode).toBeCalledWith("node-10");

		expect(node.heartbeat).toBeCalledTimes(0);
	});

	it("should call discoverNode if instanceID different", async () => {
		discoverer.discoverNode.mockClear();
		registry.nodes.get.mockClear();
		node.heartbeat.mockClear();

		discoverer.heartbeatReceived("node-10", { instanceID: "iid-2" });

		expect(discoverer.discoverNode).toBeCalledTimes(1);
		expect(discoverer.discoverNode).toBeCalledWith("node-10");

		expect(node.heartbeat).toBeCalledTimes(0);
	});

	it("should call heartbeat if instanceID & seq same", async () => {
		discoverer.discoverNode.mockClear();
		registry.nodes.get.mockClear();
		node.heartbeat.mockClear();

		discoverer.heartbeatReceived("node-10", { seq: 2, instanceID: "iid-1" });

		expect(discoverer.discoverNode).toBeCalledTimes(0);
		expect(node.heartbeat).toBeCalledTimes(1);
		expect(node.heartbeat).toBeCalledWith({ seq: 2, instanceID: "iid-1" });
	});


	it("should call heartbeat if no instanceID in payload", async () => {
		discoverer.discoverNode.mockClear();
		registry.nodes.get.mockClear();
		node.heartbeat.mockClear();

		discoverer.heartbeatReceived("node-10", { seq: 2 });

		expect(discoverer.discoverNode).toBeCalledTimes(0);
		expect(node.heartbeat).toBeCalledTimes(1);
		expect(node.heartbeat).toBeCalledWith({ seq: 2 });
	});

	it("should call heartbeat if not seq in payload", async () => {
		discoverer.discoverNode.mockClear();
		registry.nodes.get.mockClear();
		node.heartbeat.mockClear();

		discoverer.heartbeatReceived("node-10", {});

		expect(discoverer.discoverNode).toBeCalledTimes(0);
		expect(node.heartbeat).toBeCalledTimes(1);
		expect(node.heartbeat).toBeCalledWith({});
	});
});


describe("Test BaseDiscoverer 'processRemoteNodeInfo' method", () => {

	const broker = new ServiceBroker({ logger: false });
	const registry = broker.registry;

	const discoverer = new BaseDiscoverer();

	registry.processNodeInfo = jest.fn();

	beforeAll(() => discoverer.init(registry));
	afterAll(() => discoverer.stop());

	it("should call registry processNodeInfo", async () => {
		const payload = { a: 5 };
		discoverer.processRemoteNodeInfo("node-9", payload);

		expect(registry.processNodeInfo).toBeCalledTimes(1);
		expect(registry.processNodeInfo).toBeCalledWith(payload);
	});
});

describe("Test BaseDiscoverer 'sendHeartbeat' method", () => {

	it("should do nothing if no transporter", async () => {
		const broker = new ServiceBroker({ logger: false });
		const discoverer = new BaseDiscoverer();
		discoverer.init(broker.registry);

		discoverer.sendHeartbeat();

		await discoverer.stop();
	});

	it("should call transit.sendHeartbeat if has transporter", async () => {
		const broker = new ServiceBroker({ logger: false, transporter: "Fake" });
		const discoverer = new BaseDiscoverer();
		discoverer.init(broker.registry);
		broker.transit.sendHeartbeat = jest.fn();

		discoverer.sendHeartbeat();

		expect(broker.transit.sendHeartbeat).toBeCalledTimes(1);
		expect(broker.transit.sendHeartbeat).toBeCalledWith(discoverer.localNode);

		await discoverer.stop();
	});
});

describe("Test BaseDiscoverer 'localNodeReady' method", () => {

	it("should call sendLocalNodeInfo", async () => {
		const broker = new ServiceBroker({ logger: false });
		const discoverer = new BaseDiscoverer();
		discoverer.init(broker.registry);

		discoverer.sendLocalNodeInfo = jest.fn();

		discoverer.localNodeReady();

		expect(discoverer.sendLocalNodeInfo).toBeCalledTimes(1);
		expect(discoverer.sendLocalNodeInfo).toBeCalledWith();

		await discoverer.stop();
	});
});

describe("Test BaseDiscoverer 'localNodeDisconnected' method", () => {

	it("should do nothing if no transporter", async () => {
		const broker = new ServiceBroker({ logger: false });
		const discoverer = new BaseDiscoverer();
		discoverer.init(broker.registry);

		discoverer.localNodeDisconnected();

		await discoverer.stop();
	});

	it("should call transit.sendDisconnectPacket if has transporter", async () => {
		const broker = new ServiceBroker({ logger: false, transporter: "Fake" });
		const discoverer = new BaseDiscoverer();
		discoverer.init(broker.registry);
		broker.transit.sendDisconnectPacket = jest.fn();

		discoverer.localNodeDisconnected();

		expect(broker.transit.sendDisconnectPacket).toBeCalledTimes(1);
		expect(broker.transit.sendDisconnectPacket).toBeCalledWith();

		await discoverer.stop();
	});
});

describe("Test BaseDiscoverer 'remoteNodeDisconnected' method", () => {

	it("should call sendLocalNodeInfo", async () => {
		const broker = new ServiceBroker({ logger: false });
		const registry = broker.registry;
		const discoverer = new BaseDiscoverer();
		discoverer.init(broker.registry);

		registry.nodes.disconnected = jest.fn();

		discoverer.remoteNodeDisconnected("node-2", true);

		expect(registry.nodes.disconnected).toBeCalledTimes(1);
		expect(registry.nodes.disconnected).toBeCalledWith("node-2", true);

		await discoverer.stop();
	});
});
