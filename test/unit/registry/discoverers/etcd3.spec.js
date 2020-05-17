"use strict";

jest.mock("etcd3");
const ETCD3 = require("etcd3");

const BaseDiscoverer = require("../../../../src/registry/discoverers").Base;
const Etcd3Discoverer = require("../../../../src/registry/discoverers").Etcd3;
const ServiceBroker = require("../../../../src/service-broker");
const Serializers = require("../../../../src/serializers");

describe("Test Etcd3Discoverer constructor", () => {

	const broker = new ServiceBroker({ logger: false });
	const registry = broker.registry;

	it("test constructor without opts", () => {
		const discoverer = new Etcd3Discoverer();

		expect(discoverer).toBeDefined();
		expect(discoverer.opts).toEqual({
			heartbeatInterval: null,
			heartbeatTimeout: null,

			disableHeartbeatChecks: false,
			disableOfflineNodeRemoving: false,
			cleanOfflineNodesTimeout: 600,

			etcd: undefined,
			serializer: "JSON",
			fullCheck: 10
		});

		expect(discoverer.idx).toBeDefined(); // random number
		expect(discoverer.client).toBeNull();

		expect(discoverer.lastInfoSeq).toBe(0);
		expect(discoverer.lastBeatSeq).toBe(0);

		expect(discoverer.leaseBeat).toBeNull();
		expect(discoverer.leaseInfo).toBeNull();
	});

	it("test constructor with opts", () => {
		const discoverer = new Etcd3Discoverer({
			heartbeatInterval: 5,

			etcd: {
				hosts: ["localhost:2379"],
			},
			fullCheck: 0,
			serializer: "Notepack"
		});

		expect(discoverer).toBeDefined();
		expect(discoverer.opts).toEqual({
			heartbeatInterval: 5,
			heartbeatTimeout: null,

			disableHeartbeatChecks: false,
			disableOfflineNodeRemoving: false,
			cleanOfflineNodesTimeout: 600,

			etcd: {
				hosts: ["localhost:2379"],
			},
			fullCheck: 0,
			serializer: "Notepack"
		});

		expect(discoverer.idx).toBe(0);
		expect(discoverer.client).toBeNull();

		expect(discoverer.lastInfoSeq).toBe(0);
		expect(discoverer.lastBeatSeq).toBe(0);

		expect(discoverer.leaseBeat).toBeNull();
		expect(discoverer.leaseInfo).toBeNull();
	});

});

describe("Test Etcd3Discoverer 'init' method", () => {
	const broker = new ServiceBroker({ logger: false, nodeID: "node-99" });
	jest.spyOn(Serializers.JSON.prototype, "init");

	broker.instanceID = "12345678-90";

	it("init without opts", () => {
		const discoverer = new Etcd3Discoverer();

		ETCD3.Etcd3.mockClear();
		Serializers.JSON.prototype.init.mockClear();
		jest.spyOn(BaseDiscoverer.prototype, "init");

		// ---- ^ SETUP ^ ---
		discoverer.init(broker.registry);
		// ---- ˇ ASSERTS ˇ ---
		expect(discoverer.instanceHash).toBe("12345678");
		expect(discoverer.PREFIX).toBe("moleculer/discovery");
		expect(discoverer.BEAT_KEY).toBe("moleculer/discovery/beats/node-99/12345678");
		expect(discoverer.INFO_KEY).toBe("moleculer/discovery/info/node-99");

		expect(discoverer.client).toBeInstanceOf(ETCD3.Etcd3);
		expect(discoverer.serializer).toBeInstanceOf(Serializers.JSON);

		expect(ETCD3.Etcd3).toHaveBeenCalledTimes(1);
		expect(ETCD3.Etcd3).toHaveBeenCalledWith(undefined);

		expect(Serializers.JSON.prototype.init).toHaveBeenCalledTimes(1);
		expect(Serializers.JSON.prototype.init).toHaveBeenCalledWith(broker);

		expect(BaseDiscoverer.prototype.init).toHaveBeenCalledTimes(1);
		expect(BaseDiscoverer.prototype.init).toHaveBeenCalledWith(broker.registry);
	});

	it("init with opts", () => {
		broker.namespace = "testing";
		const discoverer = new Etcd3Discoverer({
			etcd: {
				hosts: ["localhost:2379"],
			}
		});

		ETCD3.Etcd3.mockClear();
		Serializers.JSON.prototype.init.mockClear();
		// ---- ^ SETUP ^ ---
		discoverer.init(broker.registry);
		// ---- ˇ ASSERTS ˇ ---
		expect(discoverer.instanceHash).toBe("12345678");
		expect(discoverer.PREFIX).toBe("moleculer-testing/discovery");
		expect(discoverer.BEAT_KEY).toBe("moleculer-testing/discovery/beats/node-99/12345678");
		expect(discoverer.INFO_KEY).toBe("moleculer-testing/discovery/info/node-99");

		expect(discoverer.client).toBeInstanceOf(ETCD3.Etcd3);
		expect(discoverer.serializer).toBeInstanceOf(Serializers.JSON);

		expect(ETCD3.Etcd3).toHaveBeenCalledTimes(1);
		expect(ETCD3.Etcd3).toHaveBeenCalledWith({
			hosts: ["localhost:2379"]
		});

		expect(Serializers.JSON.prototype.init).toHaveBeenCalledTimes(1);
		expect(Serializers.JSON.prototype.init).toHaveBeenCalledWith(broker);
	});

});

describe("Test Etcd3Discoverer 'stop' method", () => {

	it("should call client quit", async () => {
		const broker = new ServiceBroker({ logger: false });
		const registry = broker.registry;

		const discoverer = new Etcd3Discoverer();

		discoverer.init(registry);
		discoverer.client.close = jest.fn();
		jest.spyOn(BaseDiscoverer.prototype, "stop");
		// ---- ^ SETUP ^ ---
		await discoverer.stop();
		// ---- ˇ ASSERTS ˇ ---
		expect(discoverer.client.close).toBeCalledTimes(1);
		expect(discoverer.client.close).toBeCalledWith();

		expect(BaseDiscoverer.prototype.stop).toHaveBeenCalledTimes(1);
	});

	it("should do nothing if no client", async () => {
		const broker = new ServiceBroker({ logger: false });
		const registry = broker.registry;

		const discoverer = new Etcd3Discoverer();
		// ---- ^ SETUP ^ ---
		await discoverer.stop();
	});
});

describe("Test Etcd3Discoverer 'registerMoleculerMetrics' method", () => {

	it("should register metrics", async () => {
		const broker = new ServiceBroker({ logger: false });
		const registry = broker.registry;

		const discoverer = new Etcd3Discoverer();

		discoverer.init(registry);
		jest.spyOn(broker.metrics, "register");
		// ---- ^ SETUP ^ ---
		await discoverer.registerMoleculerMetrics();
		// ---- ˇ ASSERTS ˇ ---
		expect(broker.metrics.register).toBeCalledTimes(2);
		expect(broker.metrics.register).toBeCalledWith({ name: "moleculer.discoverer.etcd.collect.total", rate: true, type: "counter", description: "Number of Service Registry fetching from etcd",  });
		expect(broker.metrics.register).toBeCalledWith({ name: "moleculer.discoverer.etcd.collect.time", quantiles: true, type: "histogram", unit: "millisecond", description: "Time of Service Registry fetching from etcd" });
	});
});


describe("Test Etcd3Discoverer 'sendHeartbeat' method", () => {
	const broker = new ServiceBroker({ logger: false, nodeID: "node-99" });
	broker.instanceID = "1234567890";

	const discoverer = new Etcd3Discoverer();
	jest.spyOn(broker.metrics, "timer");
	jest.spyOn(broker.metrics, "increment");

	const fakeLease = {
		grant: jest.fn(() => Promise.resolve()),
		revoke: jest.fn(() => Promise.resolve()),
		put: jest.fn(() => fakeLease),
		value: jest.fn()
	};
	const fakeLease2 = {
		grant: jest.fn(() => Promise.resolve()),
		revoke: jest.fn(() => Promise.resolve()),
		put: jest.fn(() => fakeLease2),
		value: jest.fn()
	};

	beforeAll(() => {
		discoverer.init(broker.registry);
		discoverer.serializer.serialize = jest.fn(data => data);
		discoverer.client.lease = jest.fn(() => fakeLease);
		discoverer.collectOnlineNodes = jest.fn();
		jest.spyOn(discoverer.logger, "error");
	});
	afterAll(() => discoverer.stop());

	it("should create leaseBeat & set HB key on etcd3 & call collectNodes", async () => {
		discoverer.logger.error.mockClear();
		broker.metrics.increment.mockClear();
		broker.metrics.timer.mockClear();
		discoverer.serializer.serialize.mockClear();
		discoverer.collectOnlineNodes.mockClear();
		// ---- ^ SETUP ^ ---
		await discoverer.sendHeartbeat();
		// ---- ˇ ASSERTS ˇ ---
		expect(broker.metrics.timer).toBeCalledTimes(1);
		expect(broker.metrics.timer).toBeCalledWith("moleculer.discoverer.etcd.collect.time");

		expect(discoverer.client.lease).toBeCalledTimes(1);
		expect(discoverer.client.lease).toBeCalledWith(30);
		expect(fakeLease.grant).toBeCalledTimes(1);
		expect(discoverer.leaseBeat).toBe(fakeLease);

		expect(discoverer.serializer.serialize).toBeCalledTimes(1);
		expect(fakeLease.put).toBeCalledTimes(1);
		expect(fakeLease.put).toBeCalledWith("moleculer/discovery/beats/node-99/12345678/1");
		expect(fakeLease.value).toBeCalledTimes(1);
		expect(fakeLease.value).toBeCalledWith({ cpu: null, sender: "node-99", seq: 1, ver: "4", instanceID: "1234567890" });

		expect(discoverer.lastBeatSeq).toBe(1);

		expect(discoverer.collectOnlineNodes).toBeCalledTimes(1);

		expect(discoverer.logger.error).toBeCalledTimes(0);

		expect(broker.metrics.increment).toBeCalledTimes(1);
		expect(broker.metrics.increment).toBeCalledWith("moleculer.discoverer.etcd.collect.total");
	});

	it("should set HB key without del if seq is same", async () => {
		discoverer.logger.error.mockClear();
		broker.metrics.increment.mockClear();
		broker.metrics.timer.mockClear();
		discoverer.serializer.serialize.mockClear();
		discoverer.client.lease.mockClear();
		discoverer.collectOnlineNodes.mockClear();
		fakeLease.grant.mockClear();
		fakeLease.revoke.mockClear();
		fakeLease.put.mockClear();
		fakeLease.value.mockClear();

		// ---- ^ SETUP ^ ---
		await discoverer.sendHeartbeat();
		// ---- ˇ ASSERTS ˇ ---
		expect(broker.metrics.timer).toBeCalledTimes(1);
		expect(broker.metrics.timer).toBeCalledWith("moleculer.discoverer.etcd.collect.time");

		expect(discoverer.client.lease).toBeCalledTimes(0);
		expect(fakeLease.grant).toBeCalledTimes(0);

		expect(discoverer.serializer.serialize).toBeCalledTimes(1);
		expect(fakeLease.put).toBeCalledTimes(1);
		expect(fakeLease.put).toBeCalledWith("moleculer/discovery/beats/node-99/12345678/1");
		expect(fakeLease.value).toBeCalledTimes(1);
		expect(fakeLease.value).toBeCalledWith({ cpu: null, sender: "node-99", seq: 1, ver: "4", instanceID: "1234567890" });

		expect(discoverer.lastBeatSeq).toBe(1);

		expect(discoverer.collectOnlineNodes).toBeCalledTimes(1);

		expect(discoverer.logger.error).toBeCalledTimes(0);

		expect(broker.metrics.increment).toBeCalledTimes(1);
		expect(broker.metrics.increment).toBeCalledWith("moleculer.discoverer.etcd.collect.total");
	});

	it("should recreate lease if seq is same", async () => {
		discoverer.logger.error.mockClear();
		broker.metrics.increment.mockClear();
		broker.metrics.timer.mockClear();
		discoverer.serializer.serialize.mockClear();
		discoverer.client.lease = jest.fn(() => fakeLease2);
		discoverer.collectOnlineNodes.mockClear();
		fakeLease.grant.mockClear();
		fakeLease.revoke.mockClear();
		fakeLease.put.mockClear();
		fakeLease.value.mockClear();

		discoverer.localNode.seq++;
		discoverer.leaseBeat = fakeLease;

		// ---- ^ SETUP ^ ---
		await discoverer.sendHeartbeat();
		// ---- ˇ ASSERTS ˇ ---
		expect(fakeLease.revoke).toBeCalledTimes(1);

		expect(discoverer.client.lease).toBeCalledTimes(1);
		expect(discoverer.client.lease).toBeCalledWith(30);
		expect(fakeLease2.grant).toBeCalledTimes(1);
		expect(discoverer.leaseBeat).toBe(fakeLease2);


		expect(discoverer.serializer.serialize).toBeCalledTimes(1);
		expect(fakeLease2.put).toBeCalledTimes(1);
		expect(fakeLease2.put).toBeCalledWith("moleculer/discovery/beats/node-99/12345678/2");
		expect(fakeLease2.value).toBeCalledTimes(1);
		expect(fakeLease2.value).toBeCalledWith({ cpu: null, sender: "node-99", seq: 2, ver: "4", instanceID: "1234567890" });

		expect(discoverer.lastBeatSeq).toBe(2);

		expect(discoverer.collectOnlineNodes).toBeCalledTimes(1);

		expect(discoverer.logger.error).toBeCalledTimes(0);
	});
});

describe("Test Etcd3Discoverer 'collectOnlineNodes' method", () => {
	const broker = new ServiceBroker({ logger: false, nodeID: "node-99" });
	broker.instanceID = "1234567890";

	const discoverer = new Etcd3Discoverer();
	const fakeClient = {
		prefix: jest.fn(() => fakeClient),
		buffers: jest.fn(() => Promise.resolve([])),
		keys: jest.fn(() => Promise.resolve([])),
	};

	beforeAll(() => {
		discoverer.init(broker.registry);
		discoverer.remoteNodeDisconnected = jest.fn();
		discoverer.heartbeatReceived = jest.fn();
		discoverer.client.getAll = jest.fn(() => fakeClient);
		discoverer.serializer.deserialize = jest.fn(data => data);
		discoverer.client.mgetBuffer = jest.fn(async () => ["fake-data1", "fake-data2"]);
		jest.spyOn(discoverer.logger, "error");
	});
	beforeEach(() => {
		discoverer.remoteNodeDisconnected.mockClear();
		discoverer.heartbeatReceived.mockClear();
		discoverer.logger.error.mockClear();
		discoverer.client.getAll.mockClear();
		discoverer.client.mgetBuffer.mockClear();
		discoverer.serializer.deserialize.mockClear();
		fakeClient.prefix.mockClear();
		fakeClient.buffers.mockClear();
		fakeClient.keys.mockClear();
	});
	afterAll(() => discoverer.stop());

	it("should handle empty list", async () => {
		discoverer.opts.fullCheck = 0;
		broker.registry.nodes.list = jest.fn(() => []);
		// ---- ^ SETUP ^ ---
		await discoverer.collectOnlineNodes();
		// ---- ˇ ASSERTS ˇ ---
		expect(broker.registry.nodes.list).toBeCalledTimes(1);
		expect(broker.registry.nodes.list).toBeCalledWith({ onlyAvailable: true, withServices: false });

		expect(discoverer.client.getAll).toBeCalledTimes(1);
		expect(fakeClient.prefix).toBeCalledTimes(1);
		expect(fakeClient.prefix).toBeCalledWith("moleculer/discovery/beats/");
		expect(fakeClient.keys).toBeCalledTimes(1);

		expect(discoverer.remoteNodeDisconnected).toBeCalledTimes(0);
		expect(discoverer.heartbeatReceived).toBeCalledTimes(0);
	});

	it("should disconnect previous nodes", async () => {
		discoverer.opts.scanLength = 50;
		broker.registry.nodes.list = jest.fn(() => [{ id: "node-1" }, { id: "node-2" }, { id: "node-99" }]);
		// ---- ^ SETUP ^ ---
		await discoverer.collectOnlineNodes();
		// ---- ˇ ASSERTS ˇ ---
		expect(broker.registry.nodes.list).toBeCalledTimes(1);
		expect(broker.registry.nodes.list).toBeCalledWith({ onlyAvailable: true, withServices: false });

		expect(discoverer.client.getAll).toBeCalledTimes(1);
		expect(fakeClient.prefix).toBeCalledTimes(1);
		expect(fakeClient.prefix).toBeCalledWith("moleculer/discovery/beats/");
		expect(fakeClient.keys).toBeCalledTimes(1);

		expect(discoverer.heartbeatReceived).toBeCalledTimes(0);
		expect(discoverer.remoteNodeDisconnected).toBeCalledTimes(2);
		expect(discoverer.remoteNodeDisconnected).toBeCalledWith("node-1", true);
		expect(discoverer.remoteNodeDisconnected).toBeCalledWith("node-2", true);
	});

	it("should add new nodes (full check)", async () => {
		discoverer.opts.fullCheck = 1;
		broker.registry.nodes.list = jest.fn(() => [{ id: "node-1" }, { id: "node-2" }, { id: "node-3" }, { id: "node-99" }]);
		fakeClient.buffers = jest.fn(() => Promise.resolve([
			{ instanceID: "111", sender: "node-1", seq: 1 },
			{ instanceID: "222", sender: "node-2", seq: 2 },
			{ instanceID: "999", sender: "node-99", seq: 9 }
		]));
		// ---- ^ SETUP ^ ---
		await discoverer.collectOnlineNodes();
		// ---- ˇ ASSERTS ˇ ---
		expect(discoverer.client.getAll).toBeCalledTimes(1);
		expect(fakeClient.prefix).toBeCalledTimes(1);
		expect(fakeClient.prefix).toBeCalledWith("moleculer/discovery/beats/");
		expect(fakeClient.buffers).toBeCalledTimes(1);
		expect(fakeClient.keys).toBeCalledTimes(0);

		expect(discoverer.heartbeatReceived).toBeCalledTimes(2);
		expect(discoverer.heartbeatReceived).toBeCalledWith("node-1", { instanceID: "111", sender: "node-1", seq: 1 });
		expect(discoverer.heartbeatReceived).toBeCalledWith("node-2", { instanceID: "222", sender: "node-2", seq: 2 });

		expect(discoverer.remoteNodeDisconnected).toBeCalledTimes(1);
		expect(discoverer.remoteNodeDisconnected).toBeCalledWith("node-3", true);
	});

	it("should add new nodes (fast check)", async () => {
		discoverer.opts.fullCheck = 0;
		broker.registry.nodes.list = jest.fn(() => [{ id: "node-1" }, { id: "node-2" }, { id: "node-3" }, { id: "node-99" }]);
		fakeClient.keys = jest.fn(() => Promise.resolve([
			"moleculer/discovery/beats/node-1/111/1",
			"moleculer/discovery/beats/node-2/222/2",
			"moleculer/discovery/beats/node-99/999/9"
		]));
		// ---- ^ SETUP ^ ---
		await discoverer.collectOnlineNodes();
		// ---- ˇ ASSERTS ˇ ---
		expect(discoverer.client.getAll).toBeCalledTimes(1);
		expect(fakeClient.prefix).toBeCalledTimes(1);
		expect(fakeClient.prefix).toBeCalledWith("moleculer/discovery/beats/");
		expect(fakeClient.buffers).toBeCalledTimes(0);
		expect(fakeClient.keys).toBeCalledTimes(1);

		expect(discoverer.heartbeatReceived).toBeCalledTimes(2);
		expect(discoverer.heartbeatReceived).toBeCalledWith("node-1", { instanceID: "111", sender: "node-1", seq: 1, key: "moleculer/discovery/beats/node-1/111/1" });
		expect(discoverer.heartbeatReceived).toBeCalledWith("node-2", { instanceID: "222", sender: "node-2", seq: 2, key: "moleculer/discovery/beats/node-2/222/2" });

		expect(discoverer.remoteNodeDisconnected).toBeCalledTimes(1);
		expect(discoverer.remoteNodeDisconnected).toBeCalledWith("node-3", true);
	});

});

describe("Test Etcd3Discoverer 'discoverNode' method", () => {
	const broker = new ServiceBroker({ logger: false, nodeID: "node-99" });
	broker.instanceID = "1234567890";

	const discoverer = new Etcd3Discoverer();

	let buffer = jest.fn(() => Promise.resolve("fake-data"));

	beforeAll(() => {
		discoverer.init(broker.registry);
		discoverer.serializer.deserialize = jest.fn(data => data);
		discoverer.client.get = jest.fn(() => ({ buffer }));
		discoverer.processRemoteNodeInfo = jest.fn();
		jest.spyOn(discoverer.logger, "warn");
	});
	beforeEach(() => {
		discoverer.logger.warn.mockClear();
		discoverer.serializer.deserialize.mockClear();
		discoverer.client.get.mockClear();
		buffer.mockClear();
		discoverer.processRemoteNodeInfo.mockClear();
	});

	afterAll(() => discoverer.stop());

	it("should call processRemoteNodeInfo if data received", async () => {
		// ---- ^ SETUP ^ ---
		await discoverer.discoverNode("node-1");
		// ---- ˇ ASSERTS ˇ ---
		expect(discoverer.client.get).toBeCalledTimes(1);
		expect(discoverer.client.get).toBeCalledWith("moleculer/discovery/info/node-1");
		expect(buffer).toBeCalledTimes(1);

		expect(discoverer.logger.warn).toBeCalledTimes(0);

		expect(discoverer.serializer.deserialize).toBeCalledTimes(1);
		expect(discoverer.serializer.deserialize).toBeCalledWith("fake-data");

		expect(discoverer.processRemoteNodeInfo).toBeCalledTimes(1);
		expect(discoverer.processRemoteNodeInfo).toBeCalledWith("node-1", "fake-data");
	});

	it("should handle if data is invalid", async () => {
		discoverer.serializer.deserialize = jest.fn(() => { throw new Error("Unexpected token"); });
		// ---- ^ SETUP ^ ---
		await discoverer.discoverNode("node-1");
		// ---- ˇ ASSERTS ˇ ---
		expect(discoverer.client.get).toBeCalledTimes(1);
		expect(discoverer.client.get).toBeCalledWith("moleculer/discovery/info/node-1");
		expect(buffer).toBeCalledTimes(1);

		expect(discoverer.logger.warn).toBeCalledTimes(1);

		expect(discoverer.serializer.deserialize).toBeCalledTimes(1);
		expect(discoverer.serializer.deserialize).toBeCalledWith("fake-data");

		expect(discoverer.processRemoteNodeInfo).toBeCalledTimes(0);
	});

	it("should handle if no data", async () => {
		discoverer.serializer.deserialize = jest.fn(() => "fake-data");
		buffer = jest.fn(async () => null);
		// ---- ^ SETUP ^ ---
		await discoverer.discoverNode("node-1");
		// ---- ˇ ASSERTS ˇ ---
		expect(discoverer.client.get).toBeCalledTimes(1);
		expect(discoverer.client.get).toBeCalledWith("moleculer/discovery/info/node-1");
		expect(buffer).toBeCalledTimes(1);

		expect(discoverer.logger.warn).toBeCalledTimes(1);
		expect(discoverer.logger.warn).toBeCalledWith("No INFO for 'node-1' node in registry.");

		expect(discoverer.serializer.deserialize).toBeCalledTimes(0);
		expect(discoverer.processRemoteNodeInfo).toBeCalledTimes(0);
	});
});

describe("Test Etcd3Discoverer 'discoverAllNodes' method", () => {

	it("should call collectOnlineNodes", async () => {
		const broker = new ServiceBroker({ logger: false, transporter: "Fake" });
		const discoverer = new Etcd3Discoverer();
		discoverer.init(broker.registry);
		discoverer.collectOnlineNodes = jest.fn(() => Promise.resolve());

		await discoverer.discoverAllNodes();

		expect(discoverer.collectOnlineNodes).toBeCalledTimes(1);
		expect(discoverer.collectOnlineNodes).toBeCalledWith();

		await discoverer.stop();
	});
});

describe("Test Etcd3Discoverer 'sendLocalNodeInfo' method", () => {
	const broker = new ServiceBroker({ logger: false, nodeID: "node-99" });
	broker.instanceID = "1234567890";
	broker.getLocalNodeInfo = jest.fn(() => ({ a: 5 }));

	const discoverer = new Etcd3Discoverer();

	const fakeLease = {
		grant: jest.fn(() => Promise.resolve()),
		revoke: jest.fn(() => Promise.resolve()),
		put: jest.fn(() => fakeLease),
		value: jest.fn()
	};

	const fakeLease2 = {
		grant: jest.fn(() => Promise.resolve()),
		revoke: jest.fn(() => Promise.resolve()),
		put: jest.fn(() => fakeLease2),
		value: jest.fn()
	};

	beforeAll(() => {
		discoverer.init(broker.registry);
		discoverer.serializer.serialize = jest.fn(data => data);
		discoverer.client.lease = jest.fn(() => fakeLease);
		discoverer.beat = jest.fn();
		jest.spyOn(discoverer.logger, "error");
	});
	beforeEach(() => {
		discoverer.logger.error.mockClear();
		broker.getLocalNodeInfo.mockClear();
		discoverer.serializer.serialize.mockClear();
		discoverer.beat.mockClear();
		discoverer.logger.error.mockClear();
		discoverer.client.lease.mockClear();
		fakeLease.grant.mockClear();
		fakeLease.revoke.mockClear();
		fakeLease.put.mockClear();
		fakeLease.value.mockClear();
		fakeLease2.put.mockClear();
		fakeLease2.value.mockClear();
	});
	afterAll(() => discoverer.stop());

	it("should send INFO & call recreateInfoUpdateTimer & beat", async () => {
		// ---- ^ SETUP ^ ---
		await discoverer.sendLocalNodeInfo();
		// ---- ˇ ASSERTS ˇ ---
		expect(broker.getLocalNodeInfo).toBeCalledTimes(1);

		expect(discoverer.client.lease).toBeCalledTimes(1);
		expect(discoverer.client.lease).toBeCalledWith(60);
		expect(fakeLease.grant).toBeCalledTimes(1);
		expect(discoverer.leaseInfo).toBe(fakeLease);

		expect(discoverer.serializer.serialize).toBeCalledTimes(1);
		expect(fakeLease.put).toBeCalledTimes(1);
		expect(fakeLease.put).toBeCalledWith("moleculer/discovery/info/node-99");
		expect(fakeLease.value).toBeCalledTimes(1);
		expect(fakeLease.value).toBeCalledWith({ sender: "node-99", ver: "4", a: 5 });

		expect(discoverer.lastInfoSeq).toBe(1);
		expect(discoverer.beat).toBeCalledTimes(1);
		expect(discoverer.logger.error).toBeCalledTimes(0);
	});

	it("should send INFO & call recreateInfoUpdateTimer & NOT beat", async () => {
		// ---- ^ SETUP ^ ---
		await discoverer.sendLocalNodeInfo("node-10");
		// ---- ˇ ASSERTS ˇ ---
		expect(broker.getLocalNodeInfo).toBeCalledTimes(1);

		expect(discoverer.client.lease).toBeCalledTimes(0);

		expect(discoverer.serializer.serialize).toBeCalledTimes(1);
		expect(fakeLease.put).toBeCalledTimes(1);
		expect(fakeLease.put).toBeCalledWith("moleculer/discovery/info/node-99");
		expect(fakeLease.value).toBeCalledTimes(1);
		expect(fakeLease.value).toBeCalledWith({ sender: "node-99", ver: "4", a: 5 });

		expect(discoverer.lastInfoSeq).toBe(1);
		expect(discoverer.beat).toBeCalledTimes(0);
		expect(discoverer.logger.error).toBeCalledTimes(0);
	});

	it("should recreate lease if seq is same", async () => {
		discoverer.localNode.seq++;
		discoverer.leaseInfo = fakeLease;
		discoverer.client.lease = jest.fn(() => fakeLease2);

		// ---- ^ SETUP ^ ---
		await discoverer.sendLocalNodeInfo();
		// ---- ˇ ASSERTS ˇ ---
		expect(fakeLease.revoke).toBeCalledTimes(1);

		expect(discoverer.client.lease).toBeCalledTimes(1);
		expect(discoverer.client.lease).toBeCalledWith(60);
		expect(fakeLease2.grant).toBeCalledTimes(1);
		expect(discoverer.leaseInfo).toBe(fakeLease2);


		expect(discoverer.serializer.serialize).toBeCalledTimes(1);
		expect(fakeLease2.put).toBeCalledTimes(1);
		expect(fakeLease2.put).toBeCalledWith("moleculer/discovery/info/node-99");
		expect(fakeLease2.value).toBeCalledTimes(1);
		expect(fakeLease2.value).toBeCalledWith({ sender: "node-99", ver: "4", a: 5 });

		expect(discoverer.lastInfoSeq).toBe(2);
		expect(discoverer.beat).toBeCalledTimes(1);
		expect(discoverer.logger.error).toBeCalledTimes(0);
	});

	it("should handle error", async () => {
		const err = new Error("Something happened");
		fakeLease2.value = jest.fn(() => Promise.reject(err));
		// ---- ^ SETUP ^ ---
		await discoverer.sendLocalNodeInfo();
		// ---- ˇ ASSERTS ˇ ---
		expect(fakeLease2.put).toBeCalledTimes(1);

		expect(discoverer.beat).toBeCalledTimes(0);

		expect(discoverer.logger.error).toBeCalledTimes(1);
		expect(discoverer.logger.error).toBeCalledWith("Unable to send INFO to etcd server", err);
	});

});

describe("Test Etcd3Discoverer 'localNodeDisconnected' method", () => {

	it("should call localNodeDisconnected & del & scanClean", async () => {
		const broker = new ServiceBroker({ logger: false, nodeID: "node-99" });
		broker.instanceID = "1234567890";
		const discoverer = new Etcd3Discoverer();
		discoverer.init(broker.registry);
		const fakeDelete = {
			key: jest.fn()
		};
		discoverer.client.delete = jest.fn(() => fakeDelete);
		discoverer.leaseBeat = { revoke: jest.fn() };
		discoverer.leaseInfo = { revoke: jest.fn() };

		jest.spyOn(BaseDiscoverer.prototype, "localNodeDisconnected");

		await discoverer.localNodeDisconnected();

		expect(BaseDiscoverer.prototype.localNodeDisconnected).toBeCalledTimes(1);

		expect(discoverer.client.delete).toBeCalledTimes(2);
		expect(fakeDelete.key).toBeCalledTimes(2);
		expect(fakeDelete.key).toBeCalledWith("moleculer/discovery/info/node-99");
		expect(fakeDelete.key).toBeCalledWith("moleculer/discovery/beats/node-99/12345678");

		expect(discoverer.leaseBeat.revoke).toBeCalledTimes(1);
		expect(discoverer.leaseInfo.revoke).toBeCalledTimes(1);

		await discoverer.stop();
	});
});
