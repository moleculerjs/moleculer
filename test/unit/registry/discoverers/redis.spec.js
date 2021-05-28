"use strict";

jest.mock("ioredis");
const Redis = require("ioredis");

const BaseDiscoverer = require("../../../../src/registry/discoverers").Base;
const RedisDiscoverer = require("../../../../src/registry/discoverers").Redis;
const ServiceBroker = require("../../../../src/service-broker");
const Serializers = require("../../../../src/serializers");
const P = require("../../../../src/packets");

describe("Test RedisDiscoverer constructor", () => {

	const broker = new ServiceBroker({ logger: false });
	const registry = broker.registry;

	it("test constructor without opts", () => {
		const discoverer = new RedisDiscoverer();

		expect(discoverer).toBeDefined();
		expect(discoverer.opts).toEqual({
			heartbeatInterval: null,
			heartbeatTimeout: null,

			disableHeartbeatChecks: false,
			disableOfflineNodeRemoving: false,
			cleanOfflineNodesTimeout: 600,

			redis: null,
			serializer: "JSON",
			fullCheck: 10,
			scanLength: 100,
			monitor: false,
		});

		expect(discoverer.idx).toBeDefined(); // random number
		expect(discoverer.client).toBeNull();
		expect(discoverer.infoUpdateTimer).toBeNull();

		expect(discoverer.lastInfoSeq).toBe(0);
		expect(discoverer.lastBeatSeq).toBe(0);

		expect(discoverer.reconnecting).toBe(false);
	});

	it("test constructor with opts", () => {
		const discoverer = new RedisDiscoverer({
			heartbeatInterval: 5,

			redis: {
				host: "localhost",
				port: 6379,
				db: 3
			},
			fullCheck: 0,
			serializer: "Notepack",
			scanLength: 255,
			monitor: true
		});

		expect(discoverer).toBeDefined();
		expect(discoverer.opts).toEqual({
			heartbeatInterval: 5,
			heartbeatTimeout: null,

			disableHeartbeatChecks: false,
			disableOfflineNodeRemoving: false,
			cleanOfflineNodesTimeout: 600,

			redis: {
				host: "localhost",
				port: 6379,
				db: 3
			},
			fullCheck: 0,
			serializer: "Notepack",
			scanLength: 255,
			monitor: true
		});

		expect(discoverer.idx).toBe(0);
		expect(discoverer.client).toBeNull();
		expect(discoverer.infoUpdateTimer).toBeNull();

		expect(discoverer.lastInfoSeq).toBe(0);
		expect(discoverer.lastBeatSeq).toBe(0);

		expect(discoverer.reconnecting).toBe(false);
	});

});

describe("Test RedisDiscoverer 'init' method", () => {
	const broker = new ServiceBroker({ logger: false, nodeID: "node-99" });
	jest.spyOn(Serializers.JSON.prototype, "init");

	broker.instanceID = "12345678-90";

	it("init without opts", () => {
		const discoverer = new RedisDiscoverer();

		Redis.mockClear();
		Serializers.JSON.prototype.init.mockClear();
		jest.spyOn(BaseDiscoverer.prototype, "init");

		// ---- ^ SETUP ^ ---
		discoverer.init(broker.registry);
		// ---- ˇ ASSERTS ˇ ---
		expect(discoverer.instanceHash).toBe("12345678");
		expect(discoverer.PREFIX).toBe("MOL-DSCVR");
		expect(discoverer.BEAT_KEY).toBe("MOL-DSCVR-BEAT:node-99|12345678");
		expect(discoverer.INFO_KEY).toBe("MOL-DSCVR-INFO:node-99");

		expect(discoverer.client).toBeInstanceOf(Redis);
		expect(discoverer.serializer).toBeInstanceOf(Serializers.JSON);

		expect(Redis).toHaveBeenCalledTimes(1);
		expect(Redis).toHaveBeenCalledWith(null);

		expect(Serializers.JSON.prototype.init).toHaveBeenCalledTimes(1);
		expect(Serializers.JSON.prototype.init).toHaveBeenCalledWith(broker);

		expect(BaseDiscoverer.prototype.init).toHaveBeenCalledTimes(1);
		expect(BaseDiscoverer.prototype.init).toHaveBeenCalledWith(broker.registry);
	});

	it("init with opts", () => {
		broker.namespace = "TESTING";
		const discoverer = new RedisDiscoverer({
			redis: {
				host: "redis-server",
				db: 3
			},
			monitor: true
		});

		Redis.mockClear();
		Serializers.JSON.prototype.init.mockClear();
		// ---- ^ SETUP ^ ---
		discoverer.init(broker.registry);
		// ---- ˇ ASSERTS ˇ ---
		expect(discoverer.instanceHash).toBe("12345678");
		expect(discoverer.PREFIX).toBe("MOL-TESTING-DSCVR");
		expect(discoverer.BEAT_KEY).toBe("MOL-TESTING-DSCVR-BEAT:node-99|12345678");
		expect(discoverer.INFO_KEY).toBe("MOL-TESTING-DSCVR-INFO:node-99");

		expect(discoverer.client).toBeInstanceOf(Redis);
		expect(discoverer.serializer).toBeInstanceOf(Serializers.JSON);

		expect(Redis).toHaveBeenCalledTimes(1);
		expect(Redis).toHaveBeenCalledWith({
			host: "redis-server",
			db: 3
		});

		expect(Redis.prototype.monitor).toHaveBeenCalledTimes(1);

		expect(Serializers.JSON.prototype.init).toHaveBeenCalledTimes(1);
		expect(Serializers.JSON.prototype.init).toHaveBeenCalledWith(broker);
	});

	it("init Redis cluster client", () => {
		broker.namespace = "TESTING";
		const discoverer = new RedisDiscoverer({
			cluster: {
				nodes: ["redis-server"],
				options: { db: 3 }
			}
		});

		Redis.Cluster.mockClear();
		Serializers.JSON.prototype.init.mockClear();
		// ---- ^ SETUP ^ ---
		discoverer.init(broker.registry);
		// ---- ˇ ASSERTS ˇ ---
		expect(discoverer.instanceHash).toBe("12345678");
		expect(discoverer.PREFIX).toBe("MOL-TESTING-DSCVR");
		expect(discoverer.BEAT_KEY).toBe("MOL-TESTING-DSCVR-BEAT:node-99|12345678");
		expect(discoverer.INFO_KEY).toBe("MOL-TESTING-DSCVR-INFO:node-99");

		expect(discoverer.client).toBeInstanceOf(Redis.Cluster);
		expect(discoverer.serializer).toBeInstanceOf(Serializers.JSON);

		expect(Redis.Cluster).toHaveBeenCalledTimes(1);
		expect(Redis.Cluster).toHaveBeenCalledWith(["redis-server"], { db: 3 });

		expect(Serializers.JSON.prototype.init).toHaveBeenCalledTimes(1);
		expect(Serializers.JSON.prototype.init).toHaveBeenCalledWith(broker);
	});

	describe("check Redis client events", () => {
		const discoverer = new RedisDiscoverer();

		Redis.mockClear();
		const redisCallbacks = {};
		Redis.prototype.on = jest.fn((name, cb) => redisCallbacks[name] = cb);

		it("should register callbacks", () => {
			Redis.prototype.on.mockClear();
			// ---- ^ SETUP ^ ---
			discoverer.init(broker.registry);
			// ---- ˇ ASSERTS ˇ ---
			expect(Redis.prototype.on).toHaveBeenCalledTimes(3);
			expect(Redis.prototype.on).toHaveBeenCalledWith("connect", expect.any(Function));
			expect(Redis.prototype.on).toHaveBeenCalledWith("reconnecting", expect.any(Function));
			expect(Redis.prototype.on).toHaveBeenCalledWith("error", expect.any(Function));
		});

		it("should not call sendLocalNodeInfo", () => {
			Redis.prototype.on.mockClear();
			discoverer.sendLocalNodeInfo = jest.fn();
			discoverer.init(broker.registry);
			// ---- ^ SETUP ^ ---
			redisCallbacks["connect"]();
			// ---- ˇ ASSERTS ˇ ---
			expect(discoverer.reconnecting).toBe(false);
			expect(discoverer.sendLocalNodeInfo).toHaveBeenCalledTimes(0);
		});

		it("should call sendLocalNodeInfo", () => {
			Redis.prototype.on.mockClear();
			discoverer.sendLocalNodeInfo = jest.fn();
			discoverer.init(broker.registry);
			discoverer.reconnecting = true;
			// ---- ^ SETUP ^ ---
			redisCallbacks["connect"]();
			// ---- ˇ ASSERTS ˇ ---
			expect(discoverer.reconnecting).toBe(false);
			expect(discoverer.sendLocalNodeInfo).toHaveBeenCalledTimes(1);
			expect(discoverer.sendLocalNodeInfo).toHaveBeenCalledWith();
		});

		it("should set reconnecting property", () => {
			Redis.prototype.on.mockClear();
			discoverer.sendLocalNodeInfo = jest.fn();
			discoverer.init(broker.registry);
			discoverer.reconnecting = false;
			discoverer.lastInfoSeq = 5;
			discoverer.lastBeatSeq = 5;
			// ---- ^ SETUP ^ ---
			redisCallbacks["reconnecting"]();
			// ---- ˇ ASSERTS ˇ ---
			expect(discoverer.reconnecting).toBe(true);
			expect(discoverer.lastInfoSeq).toBe(0);
			expect(discoverer.lastBeatSeq).toBe(0);
		});
	});

});

describe("Test RedisDiscoverer 'stop' method", () => {

	it("should call client quit", async () => {
		const broker = new ServiceBroker({ logger: false });
		const registry = broker.registry;

		const discoverer = new RedisDiscoverer();

		discoverer.init(registry);
		discoverer.client.quit = jest.fn();
		jest.spyOn(BaseDiscoverer.prototype, "stop");
		// ---- ^ SETUP ^ ---
		await discoverer.stop();
		// ---- ˇ ASSERTS ˇ ---
		expect(discoverer.client.quit).toBeCalledTimes(1);
		expect(discoverer.client.quit).toBeCalledWith();

		expect(BaseDiscoverer.prototype.stop).toHaveBeenCalledTimes(1);
	});

	it("should do nothing if no client", async () => {
		const broker = new ServiceBroker({ logger: false });
		const registry = broker.registry;

		const discoverer = new RedisDiscoverer();
		// ---- ^ SETUP ^ ---
		await discoverer.stop();
	});
});

describe("Test RedisDiscoverer 'registerMoleculerMetrics' method", () => {

	it("should register metrics", async () => {
		const broker = new ServiceBroker({ logger: false });
		const registry = broker.registry;

		const discoverer = new RedisDiscoverer();

		discoverer.init(registry);
		jest.spyOn(broker.metrics, "register");
		// ---- ^ SETUP ^ ---
		await discoverer.registerMoleculerMetrics();
		// ---- ˇ ASSERTS ˇ ---
		expect(broker.metrics.register).toBeCalledTimes(2);
		expect(broker.metrics.register).toBeCalledWith({ name: "moleculer.discoverer.redis.collect.total", rate: true, type: "counter", description: "Number of Service Registry fetching from Redis",  });
		expect(broker.metrics.register).toBeCalledWith({ name: "moleculer.discoverer.redis.collect.time", quantiles: true, type: "histogram", unit: "millisecond", description: "Time of Service Registry fetching from Redis" });
	});
});

describe("Test RedisDiscoverer 'recreateInfoUpdateTimer' method", () => {
	const broker = new ServiceBroker({ logger: false, nodeID: "node-99" });
	const discoverer = new RedisDiscoverer();
	jest.spyOn(discoverer, "recreateInfoUpdateTimer");

	beforeAll(() => discoverer.init(broker.registry));
	afterAll(() => discoverer.stop());

	it("should recreate timer & call client.expire", async () => {
		expect(discoverer.infoUpdateTimer).toBeNull();
		discoverer.client.expire = jest.fn();

		jest.useFakeTimers();
		// ---- ^ SETUP ^ ---
		await discoverer.recreateInfoUpdateTimer();
		// ---- ˇ ASSERTS ˇ ---
		expect(discoverer.infoUpdateTimer).toBeDefined();

		jest.advanceTimersByTime(21 * 60 * 1000);

		expect(discoverer.recreateInfoUpdateTimer).toBeCalledTimes(2);
		expect(discoverer.client.expire).toBeCalledTimes(1);
		expect(discoverer.client.expire).toBeCalledWith("MOL-DSCVR-INFO:node-99", 3600);
	});
});

describe("Test RedisDiscoverer 'sendHeartbeat' method", () => {
	const broker = new ServiceBroker({ logger: false, nodeID: "node-99" });
	broker.instanceID = "1234567890";

	const discoverer = new RedisDiscoverer();
	jest.spyOn(broker.metrics, "timer");
	jest.spyOn(broker.metrics, "increment");

	const fakePipeline = {
		del: jest.fn(() => fakePipeline),
		setex: jest.fn(() => fakePipeline),
		exec: jest.fn(() => Promise.resolve()),
	};

	beforeAll(() => {
		discoverer.init(broker.registry);
		discoverer.serializer.serialize = jest.fn(data => data);
		discoverer.client.multi = jest.fn(() => fakePipeline);
		discoverer.collectOnlineNodes = jest.fn();
		jest.spyOn(discoverer.logger, "error");
	});
	afterAll(() => discoverer.stop());

	it("should set HB key on Redis & call collectNodes", async () => {
		discoverer.logger.error.mockClear();
		broker.metrics.increment.mockClear();
		broker.metrics.timer.mockClear();
		discoverer.serializer.serialize.mockClear();
		discoverer.collectOnlineNodes.mockClear();
		// ---- ^ SETUP ^ ---
		await discoverer.sendHeartbeat();
		// ---- ˇ ASSERTS ˇ ---
		expect(broker.metrics.timer).toBeCalledTimes(1);
		expect(broker.metrics.timer).toBeCalledWith("moleculer.discoverer.redis.collect.time");

		expect(discoverer.client.multi).toBeCalledTimes(1);
		expect(fakePipeline.del).toBeCalledTimes(1);
		expect(fakePipeline.del).toBeCalledWith("MOL-DSCVR-BEAT:node-99|12345678|0");
		expect(discoverer.serializer.serialize).toBeCalledTimes(1);
		expect(fakePipeline.setex).toBeCalledTimes(1);
		expect(fakePipeline.setex).toBeCalledWith("MOL-DSCVR-BEAT:node-99|12345678|1", 30, { cpu: null, instanceID: "1234567890", sender: "node-99", seq: 1, ver: "4" });
		expect(fakePipeline.exec).toBeCalledTimes(1);

		expect(discoverer.lastBeatSeq).toBe(1);

		expect(discoverer.collectOnlineNodes).toBeCalledTimes(1);

		expect(discoverer.logger.error).toBeCalledTimes(0);

		expect(broker.metrics.increment).toBeCalledTimes(1);
		expect(broker.metrics.increment).toBeCalledWith("moleculer.discoverer.redis.collect.total");
	});

	it("should set HB key without del if seq is same", async () => {
		discoverer.logger.error.mockClear();
		broker.metrics.increment.mockClear();
		broker.metrics.timer.mockClear();
		discoverer.serializer.serialize.mockClear();
		discoverer.client.multi.mockClear();
		discoverer.collectOnlineNodes.mockClear();
		fakePipeline.del.mockClear();
		fakePipeline.setex.mockClear();
		fakePipeline.exec.mockClear();

		// ---- ^ SETUP ^ ---
		await discoverer.sendHeartbeat();
		// ---- ˇ ASSERTS ˇ ---
		expect(broker.metrics.timer).toBeCalledTimes(1);
		expect(broker.metrics.timer).toBeCalledWith("moleculer.discoverer.redis.collect.time");

		expect(discoverer.client.multi).toBeCalledTimes(1);
		expect(fakePipeline.del).toBeCalledTimes(0);
		expect(discoverer.serializer.serialize).toBeCalledTimes(1);
		expect(fakePipeline.setex).toBeCalledTimes(1);
		expect(fakePipeline.setex).toBeCalledWith("MOL-DSCVR-BEAT:node-99|12345678|1", 30, { cpu: null, instanceID: "1234567890", sender: "node-99", seq: 1, ver: "4" });
		expect(fakePipeline.exec).toBeCalledTimes(1);

		expect(discoverer.lastBeatSeq).toBe(1);

		expect(discoverer.collectOnlineNodes).toBeCalledTimes(1);

		expect(discoverer.logger.error).toBeCalledTimes(0);

		expect(broker.metrics.increment).toBeCalledTimes(1);
		expect(broker.metrics.increment).toBeCalledWith("moleculer.discoverer.redis.collect.total");
	});
});

describe("Test RedisDiscoverer 'collectOnlineNodes' method", () => {
	const broker = new ServiceBroker({ logger: false, nodeID: "node-99" });
	broker.instanceID = "1234567890";

	const discoverer = new RedisDiscoverer();
	const fakeStreamCB = {};
	const fakeStream = {
		on: jest.fn((name, cb) => fakeStreamCB[name] = cb),
		pause: jest.fn(),
		resume: jest.fn(),
	};

	beforeAll(() => {
		discoverer.init(broker.registry);
		discoverer.remoteNodeDisconnected = jest.fn();
		discoverer.heartbeatReceived = jest.fn();
		discoverer.client.scanStream = jest.fn(() => fakeStream);
		discoverer.serializer.deserialize = jest.fn(data => data);
		discoverer.client.mgetBuffer = jest.fn(async () => ["fake-data1", "fake-data2"]);
		jest.spyOn(discoverer.logger, "error");
	});
	beforeEach(() => {
		discoverer.remoteNodeDisconnected.mockClear();
		discoverer.heartbeatReceived.mockClear();
		discoverer.logger.error.mockClear();
		discoverer.client.scanStream.mockClear();
		discoverer.client.mgetBuffer.mockClear();
		discoverer.serializer.deserialize.mockClear();
		fakeStream.on.mockClear();
		fakeStream.pause.mockClear();
		fakeStream.resume.mockClear();
	});
	afterAll(() => discoverer.stop());

	it("should handle empty list", async () => {
		broker.registry.nodes.list = jest.fn(() => []);
		// ---- ^ SETUP ^ ---
		const p = discoverer.collectOnlineNodes();
		fakeStreamCB.end();

		await p;
		// ---- ˇ ASSERTS ˇ ---
		expect(broker.registry.nodes.list).toBeCalledTimes(1);
		expect(broker.registry.nodes.list).toBeCalledWith({ onlyAvailable: true, withServices: false });

		expect(discoverer.client.scanStream).toBeCalledTimes(1);
		expect(discoverer.client.scanStream).toBeCalledWith({ match: "MOL-DSCVR-BEAT:*", count: 100 });

		expect(fakeStream.on).toBeCalledTimes(3);
		expect(fakeStream.on).toBeCalledWith("data", expect.any(Function));
		expect(fakeStream.on).toBeCalledWith("error", expect.any(Function));
		expect(fakeStream.on).toBeCalledWith("end", expect.any(Function));

		expect(discoverer.client.mgetBuffer).toBeCalledTimes(0);
		expect(discoverer.remoteNodeDisconnected).toBeCalledTimes(0);
		expect(discoverer.heartbeatReceived).toBeCalledTimes(0);
	});

	it("should disconnect previous nodes", async () => {
		discoverer.opts.scanLength = 50;
		broker.registry.nodes.list = jest.fn(() => [{ id: "node-1" }, { id: "node-2" }, { id: "node-99" }]);
		// ---- ^ SETUP ^ ---
		const p = discoverer.collectOnlineNodes();
		fakeStreamCB.end();

		await p;
		// ---- ˇ ASSERTS ˇ ---
		expect(broker.registry.nodes.list).toBeCalledTimes(1);
		expect(broker.registry.nodes.list).toBeCalledWith({ onlyAvailable: true, withServices: false });

		expect(discoverer.client.scanStream).toBeCalledTimes(1);
		expect(discoverer.client.scanStream).toBeCalledWith({ match: "MOL-DSCVR-BEAT:*", count: 50 });

		expect(fakeStream.on).toBeCalledTimes(3);
		expect(fakeStream.on).toBeCalledWith("data", expect.any(Function));
		expect(fakeStream.on).toBeCalledWith("error", expect.any(Function));
		expect(fakeStream.on).toBeCalledWith("end", expect.any(Function));

		expect(discoverer.client.mgetBuffer).toBeCalledTimes(0);
		expect(discoverer.heartbeatReceived).toBeCalledTimes(0);
		expect(discoverer.remoteNodeDisconnected).toBeCalledTimes(2);
		expect(discoverer.remoteNodeDisconnected).toBeCalledWith("node-1", true);
		expect(discoverer.remoteNodeDisconnected).toBeCalledWith("node-2", true);
	});

	it("should add new nodes (full check)", async () => {
		discoverer.opts.fullCheck = 1;
		broker.registry.nodes.list = jest.fn(() => [{ id: "node-1" }, { id: "node-2" }, { id: "node-3" }, { id: "node-99" }]);
		discoverer.client.mgetBuffer = jest.fn(() => Promise.resolve([
			{ instanceID: "111", sender: "node-1", seq: 1 },
			{ instanceID: "222", sender: "node-2", seq: 2 },
			{ instanceID: "999", sender: "node-99", seq: 9 }
		]));
		// ---- ^ SETUP ^ ---
		const p = discoverer.collectOnlineNodes();

		fakeStreamCB.data(["MOL-DSCVR-BEAT:node-1|111|1", "MOL-DSCVR-BEAT:node-2|222|2"]);
		fakeStreamCB.data(["MOL-DSCVR-BEAT:node-99|999|9"]);
		fakeStreamCB.end();

		await p;
		// ---- ˇ ASSERTS ˇ ---
		expect(discoverer.client.mgetBuffer).toBeCalledTimes(1);
		expect(discoverer.client.mgetBuffer).toBeCalledWith("MOL-DSCVR-BEAT:node-1|111|1", "MOL-DSCVR-BEAT:node-2|222|2", "MOL-DSCVR-BEAT:node-99|999|9");

		expect(discoverer.heartbeatReceived).toBeCalledTimes(2);
		expect(discoverer.heartbeatReceived).toBeCalledWith("node-1", { instanceID: "111", sender: "node-1", seq: 1 });
		expect(discoverer.heartbeatReceived).toBeCalledWith("node-2", { instanceID: "222", sender: "node-2", seq: 2 });

		expect(discoverer.remoteNodeDisconnected).toBeCalledTimes(1);
		expect(discoverer.remoteNodeDisconnected).toBeCalledWith("node-3", true);
	});

	it("should add new nodes (fast check)", async () => {
		discoverer.opts.fullCheck = 0;
		broker.registry.nodes.list = jest.fn(() => [{ id: "node-1" }, { id: "node-2" }, { id: "node-3" }, { id: "node-99" }]);
		// ---- ^ SETUP ^ ---
		const p = discoverer.collectOnlineNodes();

		fakeStreamCB.data(["MOL-DSCVR-BEAT:node-1|111|1", "MOL-DSCVR-BEAT:node-2|222|2"]);
		fakeStreamCB.data(["MOL-DSCVR-BEAT:node-99|999|9"]);
		fakeStreamCB.end();

		await p;
		// ---- ˇ ASSERTS ˇ ---
		expect(discoverer.client.mgetBuffer).toBeCalledTimes(0);
		expect(discoverer.heartbeatReceived).toBeCalledTimes(2);
		expect(discoverer.heartbeatReceived).toBeCalledWith("node-1", { instanceID: "111", sender: "node-1", seq: 1 });
		expect(discoverer.heartbeatReceived).toBeCalledWith("node-2", { instanceID: "222", sender: "node-2", seq: 2 });

		expect(discoverer.remoteNodeDisconnected).toBeCalledTimes(1);
		expect(discoverer.remoteNodeDisconnected).toBeCalledWith("node-3", true);
	});

	it("should stop on error", async () => {
		broker.registry.nodes.list = jest.fn(() => [{ id: "node-1" }, { id: "node-2" }, { id: "node-3" }, { id: "node-99" }]);
		// ---- ^ SETUP ^ ---
		const p = discoverer.collectOnlineNodes();

		const err = new Error("Something happened");
		fakeStreamCB.data(["MOL-DSCVR-BEAT:node-1|111|1", "MOL-DSCVR-BEAT:node-2|222|2"]);
		fakeStreamCB.error(err);
		// ---- ˇ ASSERTS ˇ ---
		try {
			await p;
		} catch(e) {
			expect(e).toBe(err);
		}
		expect(discoverer.client.mgetBuffer).toBeCalledTimes(0);
		expect(discoverer.heartbeatReceived).toBeCalledTimes(0);
		expect(discoverer.remoteNodeDisconnected).toBeCalledTimes(0);

		expect.assertions(4);
	});

});

describe("Test RedisDiscoverer 'discoverNode' method", () => {
	const broker = new ServiceBroker({ logger: false, nodeID: "node-99" });
	broker.instanceID = "1234567890";

	const discoverer = new RedisDiscoverer();

	beforeAll(() => {
		discoverer.init(broker.registry);
		discoverer.serializer.deserialize = jest.fn(data => data);
		discoverer.client.getBuffer = jest.fn(async () => "fake-data");
		discoverer.processRemoteNodeInfo = jest.fn();
		jest.spyOn(discoverer.logger, "warn");
	});
	afterAll(() => discoverer.stop());

	it("should call processRemoteNodeInfo if data received", async () => {
		discoverer.logger.warn.mockClear();
		discoverer.serializer.deserialize.mockClear();
		discoverer.client.getBuffer.mockClear();
		discoverer.processRemoteNodeInfo.mockClear();
		// ---- ^ SETUP ^ ---
		await discoverer.discoverNode("node-1");
		// ---- ˇ ASSERTS ˇ ---
		expect(discoverer.client.getBuffer).toBeCalledTimes(1);
		expect(discoverer.client.getBuffer).toBeCalledWith("MOL-DSCVR-INFO:node-1");

		expect(discoverer.logger.warn).toBeCalledTimes(0);

		expect(discoverer.serializer.deserialize).toBeCalledTimes(1);
		expect(discoverer.serializer.deserialize).toBeCalledWith("fake-data", P.PACKET_INFO);

		expect(discoverer.processRemoteNodeInfo).toBeCalledTimes(1);
		expect(discoverer.processRemoteNodeInfo).toBeCalledWith("node-1", "fake-data");
	});

	it("should handle if data is invalid", async () => {
		discoverer.logger.warn.mockClear();
		discoverer.serializer.deserialize = jest.fn(() => { throw new Error("Unexpected token"); });
		discoverer.client.getBuffer.mockClear();
		discoverer.processRemoteNodeInfo.mockClear();
		// ---- ^ SETUP ^ ---
		await discoverer.discoverNode("node-1");
		// ---- ˇ ASSERTS ˇ ---
		expect(discoverer.client.getBuffer).toBeCalledTimes(1);
		expect(discoverer.client.getBuffer).toBeCalledWith("MOL-DSCVR-INFO:node-1");

		expect(discoverer.logger.warn).toBeCalledTimes(1);

		expect(discoverer.serializer.deserialize).toBeCalledTimes(1);
		expect(discoverer.serializer.deserialize).toBeCalledWith("fake-data", P.PACKET_INFO);

		expect(discoverer.processRemoteNodeInfo).toBeCalledTimes(0);
	});

	it("should handle if no data", async () => {
		discoverer.logger.warn.mockClear();
		discoverer.serializer.deserialize = jest.fn(() => "fake-data");
		discoverer.client.getBuffer = jest.fn(async () => null);
		discoverer.processRemoteNodeInfo.mockClear();
		// ---- ^ SETUP ^ ---
		await discoverer.discoverNode("node-1");
		// ---- ˇ ASSERTS ˇ ---
		expect(discoverer.client.getBuffer).toBeCalledTimes(1);
		expect(discoverer.client.getBuffer).toBeCalledWith("MOL-DSCVR-INFO:node-1");

		expect(discoverer.logger.warn).toBeCalledTimes(1);
		expect(discoverer.logger.warn).toBeCalledWith("No INFO for 'node-1' node in registry.");

		expect(discoverer.serializer.deserialize).toBeCalledTimes(0);
		expect(discoverer.processRemoteNodeInfo).toBeCalledTimes(0);
	});
});

describe("Test RedisDiscoverer 'discoverAllNodes' method", () => {

	it("should call collectOnlineNodes", async () => {
		const broker = new ServiceBroker({ logger: false, transporter: "Fake" });
		const discoverer = new RedisDiscoverer();
		discoverer.init(broker.registry);
		discoverer.collectOnlineNodes = jest.fn(() => Promise.resolve());

		await discoverer.discoverAllNodes();

		expect(discoverer.collectOnlineNodes).toBeCalledTimes(1);
		expect(discoverer.collectOnlineNodes).toBeCalledWith();

		await discoverer.stop();
	});
});

describe("Test RedisDiscoverer 'sendLocalNodeInfo' method", () => {
	const broker = new ServiceBroker({ logger: false, nodeID: "node-99" });
	broker.instanceID = "1234567890";
	broker.getLocalNodeInfo = jest.fn(() => ({ a: 5 }));

	const discoverer = new RedisDiscoverer();

	beforeAll(() => {
		discoverer.init(broker.registry);
		discoverer.serializer.serialize = jest.fn(data => data);
		discoverer.client.setex = jest.fn(() => Promise.resolve());
		discoverer.recreateInfoUpdateTimer = jest.fn();
		discoverer.beat = jest.fn();
		jest.spyOn(discoverer.logger, "error");
	});
	beforeEach(() => {
		discoverer.logger.error.mockClear();
		broker.getLocalNodeInfo.mockClear();
		discoverer.serializer.serialize.mockClear();
		discoverer.recreateInfoUpdateTimer.mockClear();
		discoverer.beat.mockClear();
		discoverer.logger.error.mockClear();
		discoverer.client.setex.mockClear();
	});
	afterAll(() => discoverer.stop());

	it("should send INFO & call recreateInfoUpdateTimer & beat", async () => {
		// ---- ^ SETUP ^ ---
		await discoverer.sendLocalNodeInfo();
		// ---- ˇ ASSERTS ˇ ---
		expect(broker.getLocalNodeInfo).toBeCalledTimes(1);
		expect(discoverer.serializer.serialize).toBeCalledTimes(1);
		expect(discoverer.client.setex).toBeCalledTimes(1);
		expect(discoverer.client.setex).toBeCalledWith("MOL-DSCVR-INFO:node-99", 1800, { a: 5, sender: "node-99", ver: "4" });

		expect(discoverer.lastInfoSeq).toBe(1);

		expect(discoverer.recreateInfoUpdateTimer).toBeCalledTimes(1);
		expect(discoverer.beat).toBeCalledTimes(1);

		expect(discoverer.logger.error).toBeCalledTimes(0);
	});

	it("should send INFO & call recreateInfoUpdateTimer & NOT beat", async () => {
		// ---- ^ SETUP ^ ---
		await discoverer.sendLocalNodeInfo("node-10");
		// ---- ˇ ASSERTS ˇ ---
		expect(broker.getLocalNodeInfo).toBeCalledTimes(1);
		expect(discoverer.serializer.serialize).toBeCalledTimes(1);
		expect(discoverer.client.setex).toBeCalledTimes(1);
		expect(discoverer.client.setex).toBeCalledWith("MOL-DSCVR-INFO:node-99", 1800, { a: 5, sender: "node-99", ver: "4" });

		expect(discoverer.lastInfoSeq).toBe(1);

		expect(discoverer.recreateInfoUpdateTimer).toBeCalledTimes(1);
		expect(discoverer.beat).toBeCalledTimes(0);

		expect(discoverer.logger.error).toBeCalledTimes(0);
	});

	it("should handle error", async () => {
		const err = new Error("Something happened");
		discoverer.client.setex = jest.fn(() => Promise.reject(err));
		// ---- ^ SETUP ^ ---
		await discoverer.sendLocalNodeInfo();
		// ---- ˇ ASSERTS ˇ ---
		expect(discoverer.client.setex).toBeCalledTimes(1);

		expect(discoverer.recreateInfoUpdateTimer).toBeCalledTimes(0);
		expect(discoverer.beat).toBeCalledTimes(0);

		expect(discoverer.logger.error).toBeCalledTimes(1);
		expect(discoverer.logger.error).toBeCalledWith("Unable to send INFO to Redis server", err);
	});
});

describe("Test RedisDiscoverer 'localNodeDisconnected' method", () => {

	it("should call localNodeDisconnected & del & scanClean", async () => {
		const broker = new ServiceBroker({ logger: false, nodeID: "node-99" });
		broker.instanceID = "1234567890";
		const discoverer = new RedisDiscoverer();
		discoverer.init(broker.registry);
		discoverer.client.del = jest.fn();
		discoverer.scanClean = jest.fn();

		jest.spyOn(BaseDiscoverer.prototype, "localNodeDisconnected");

		await discoverer.localNodeDisconnected();

		expect(BaseDiscoverer.prototype.localNodeDisconnected).toBeCalledTimes(1);

		expect(discoverer.client.del).toBeCalledTimes(1);
		expect(discoverer.client.del).toBeCalledWith("MOL-DSCVR-INFO:node-99");

		expect(discoverer.scanClean).toBeCalledTimes(1);
		expect(discoverer.scanClean).toBeCalledWith("MOL-DSCVR-BEAT:node-99|12345678*");

		await discoverer.stop();
	});
});

describe("Test RedisDiscoverer 'scanClean' method", () => {
	const broker = new ServiceBroker({ logger: false, nodeID: "node-99" });

	const discoverer = new RedisDiscoverer({ scanLength: 50 });
	const fakeStreamCB = {};
	const fakeStream = {
		on: jest.fn((name, cb) => fakeStreamCB[name] = cb),
		pause: jest.fn(),
		resume: jest.fn(),
	};

	beforeAll(() => {
		discoverer.init(broker.registry);
		discoverer.client.scanStream = jest.fn(() => fakeStream);
		discoverer.client.del = jest.fn(() => Promise.resolve());
		jest.spyOn(discoverer.logger, "error");
	});
	beforeEach(() => {
		discoverer.logger.error.mockClear();
		discoverer.client.scanStream.mockClear();
		discoverer.client.del.mockClear();
		fakeStream.on.mockClear();
		fakeStream.pause.mockClear();
		fakeStream.resume.mockClear();
	});
	afterAll(() => discoverer.stop());

	it("should collect keys & call del with keys", async () => {
		// ---- ^ SETUP ^ ---
		const p = discoverer.scanClean("SOME.**");
		// ---- ˇ ASSERTS ˇ ---
		expect(discoverer.client.scanStream).toBeCalledTimes(1);
		expect(discoverer.client.scanStream).toBeCalledWith({ match: "SOME.**", count: 50 });

		expect(fakeStream.on).toBeCalledTimes(3);
		expect(fakeStream.on).toBeCalledWith("data", expect.any(Function));
		expect(fakeStream.on).toBeCalledWith("error", expect.any(Function));
		expect(fakeStream.on).toBeCalledWith("end", expect.any(Function));

		expect(discoverer.client.del).toBeCalledTimes(0);

		await fakeStreamCB.data(["key1", "key2"]);

		expect(discoverer.client.del).toBeCalledTimes(1);
		expect(discoverer.client.del).toBeCalledWith(["key1", "key2"]);

		expect(fakeStream.pause).toBeCalledTimes(1);
		expect(fakeStream.resume).toBeCalledTimes(1);

		fakeStreamCB.end();

		expect(discoverer.logger.error).toBeCalledTimes(0);

		await p;
	});

	it("should reject if error occured", async () => {
		// ---- ^ SETUP ^ ---
		const p = discoverer.scanClean("SOME.**");
		// ---- ˇ ASSERTS ˇ ---
		expect(discoverer.client.scanStream).toBeCalledTimes(1);
		expect(discoverer.client.scanStream).toBeCalledWith({ match: "SOME.**", count: 50 });

		expect(fakeStream.on).toBeCalledTimes(3);
		expect(fakeStream.on).toBeCalledWith("data", expect.any(Function));
		expect(fakeStream.on).toBeCalledWith("error", expect.any(Function));
		expect(fakeStream.on).toBeCalledWith("end", expect.any(Function));

		expect(discoverer.client.del).toBeCalledTimes(0);

		const err = new Error("Something happened");
		await fakeStreamCB.error(err);

		expect(discoverer.client.del).toBeCalledTimes(0);
		expect(fakeStream.pause).toBeCalledTimes(0);
		expect(fakeStream.resume).toBeCalledTimes(0);

		expect(discoverer.logger.error).toBeCalledTimes(1);

		fakeStreamCB.end();

		try {
			await p;
		} catch(e) {
			expect(e).toBe(err);
		}
		expect.assertions(12);
	});
});

