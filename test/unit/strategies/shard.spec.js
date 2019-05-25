"use strict";

let ShardStrategy = require("../../../src/strategies/shard");
let ServiceBroker = require("../../../src/service-broker");
let Context = require("../../../src/context");
let { extendExpect } = require("../utils");

extendExpect(expect);

describe("Test ShardStrategy", () => {

	describe("Test constructor", () => {
		const broker = new ServiceBroker({ logger: false });
		jest.spyOn(broker.localBus, "on");

		it("test with empty opts", () => {

			let strategy = new ShardStrategy({
				opts: {
					strategyOptions: {}
				}
			}, broker);

			expect(strategy.opts).toEqual({
				shardKey: null,
				vnodes: 10,
				ringSize: null,
				cacheSize: 1000
			});

			expect(broker.localBus.on).toHaveBeenCalledTimes(1);
			expect(broker.localBus.on).toHaveBeenCalledWith("$node.**", expect.any(Function));
		});

		it("test with options", () => {
			broker.localBus.on.mockClear();

			let strategy = new ShardStrategy({
				opts: {
					strategyOptions: {
						shardKey: "#branchID",
						vnodes: 20,
						ringSize: 100,
						cacheSize: 2000
					}
				}
			}, broker);

			expect(strategy.opts).toEqual({
				shardKey: "#branchID",
				vnodes: 20,
				ringSize: 100,
				cacheSize: 2000
			});

			expect(broker.localBus.on).toHaveBeenCalledTimes(1);
			expect(broker.localBus.on).toHaveBeenCalledWith("$node.**", expect.any(Function));
		});

		it("should set needRebuild = true if '$node.**' event received", () => {
			broker.localBus.on.mockClear();

			let strategy = new ShardStrategy({
				opts: {
					strategyOptions: {}
				}
			}, broker);

			strategy.needRebuild = false;

			broker.localBus.emit("$node.connected", { id: "node-999 " });
			expect(strategy.needRebuild).toBe(true);
		});
	});

	describe("Test getKeyFromContext", () => {
		const broker = new ServiceBroker({ logger: false });
		const ctx = new Context();
		ctx.setParams({
			a: {
				b: 5
			}
		});

		ctx.meta.user = {
			name: "John"
		};

		it("should get null if shardKey is not defined", () => {

			let strategy = new ShardStrategy({
				opts: {
					strategyOptions: {}
				}
			}, broker);

			expect(strategy.getKeyFromContext(ctx)).toBeNull();
		});

		it("should get param value", () => {

			let strategy = new ShardStrategy({
				opts: {
					strategyOptions: {
						shardKey: "a.b"
					}
				}
			}, broker);

			expect(strategy.getKeyFromContext(ctx)).toBe(5);
		});

		it("should get meta value", () => {

			let strategy = new ShardStrategy({
				opts: {
					strategyOptions: {
						shardKey: "#user.name"
					}
				}
			}, broker);

			expect(strategy.getKeyFromContext(ctx)).toBe("John");
		});

		it("should call custom shardKey function", () => {
			const shardKey = jest.fn(() => "12345");
			let strategy = new ShardStrategy({
				opts: {
					strategyOptions: {
						shardKey
					}
				}
			}, broker);

			expect(strategy.getKeyFromContext(ctx)).toBe("12345");
			expect(shardKey).toHaveBeenCalledTimes(1);
			expect(shardKey).toHaveBeenCalledWith(ctx);
		});
	});

	describe("Test getHash", () => {
		const broker = new ServiceBroker({ logger: false });

		it("should calc hash", () => {
			let strategy = new ShardStrategy({
				opts: {
					strategyOptions: {}
				}
			}, broker);

			expect(strategy.getHash("John")).toBe(1631623841);
			expect(strategy.getHash("Jane")).toBe(731224371);
			expect(strategy.getHash("Adam")).toBe(2130539036);

			expect(strategy.getHash("John")).toBe(1631623841);
			expect(strategy.getHash("Jane")).toBe(731224371);
			expect(strategy.getHash("Adam")).toBe(2130539036);
		});

		it("should calc hash", () => {
			let strategy = new ShardStrategy({
				opts: {
					strategyOptions: {
						ringSize: 1000
					}
				}
			}, broker);

			expect(strategy.getHash("John")).toBe(841);
			expect(strategy.getHash("Jane")).toBe(371);
			expect(strategy.getHash("Adam")).toBe(36);

			expect(strategy.getHash("John")).toBe(841);
			expect(strategy.getHash("Jane")).toBe(371);
			expect(strategy.getHash("Adam")).toBe(36);
		});
	});

	describe("Test rebuild", () => {
		const broker = new ServiceBroker({ logger: false });
		let prevRing;
		it("should build rings", () => {
			let strategy = new ShardStrategy({
				opts: {
					strategyOptions: {}
				}
			}, broker);

			const list = [
				{ id: "node-100" },
				{ id: "node-200" },
				{ id: "node-300" },
				{ id: "node-400" },
				{ id: "node-500" },
			];

			strategy.rebuild(list);
			expect(strategy.ring).toMatchSnapshot();
			prevRing = strategy.ring;
		});

		it("should build rings with random list", () => {
			let strategy = new ShardStrategy({
				opts: {
					strategyOptions: {}
				}
			}, broker);

			const list = [
				{ id: "node-400" },
				{ id: "node-100" },
				{ id: "node-500" },
				{ id: "node-300" },
				{ id: "node-200" },
			];

			strategy.rebuild(list);
			expect(strategy.ring).toMatchSnapshot();
			expect(strategy.ring).toEqual(prevRing);
		});

		it("should build rings with custom options", () => {
			let strategy = new ShardStrategy({
				opts: {
					strategyOptions: {
						vnodes: 2,
						ringSize: 1000
					}
				}
			}, broker);

			const list = [
				{ id: "sun" },
				{ id: "mercury" },
				{ id: "venus" },
				{ id: "earth" },
				{ id: "mars" },
				{ id: "jupyter" },
				{ id: "saturn" },
				{ id: "uranus" },
				{ id: "neptunus" },
				// Poor little Pluto...
			];

			strategy.needRebuild = true;

			strategy.rebuild(list);
			expect(strategy.ring).toMatchSnapshot();
			expect(strategy.needRebuild).toBe(false);
		});

	});

	describe("Test select", () => {
		const broker = new ServiceBroker({ logger: false });
		const ctx = new Context();

		const strategy = new ShardStrategy({
			opts: {
				strategyOptions: {}
			}
		}, broker);

		strategy.getKeyFromContext = jest.fn(() => null);
		strategy.rebuild = jest.fn();
		strategy.getHash = jest.fn(() => 123456);
		strategy.getNodeIDByKey = jest.fn(() => null);

		it("should return a random item if key is null", () => {
			const list = [
				{ id: "node-100" },
				{ id: "node-200" },
				{ id: "node-300" },
				{ id: "node-400" },
				{ id: "node-500" },
			];

			expect(strategy.select(list, ctx)).toBeAnyOf(list);
			expect(strategy.getKeyFromContext).toHaveBeenCalledTimes(1);
			expect(strategy.getKeyFromContext).toHaveBeenCalledWith(ctx);
		});

		it("should return a random item if nodeID not found", () => {
			strategy.getKeyFromContext = jest.fn(() => "key");

			const list = [
				{ id: "node-100" },
				{ id: "node-200" },
				{ id: "node-300" },
				{ id: "node-400" },
				{ id: "node-500" },
			];

			expect(strategy.select(list, ctx)).toBeAnyOf(list);

			expect(strategy.getKeyFromContext).toHaveBeenCalledTimes(1);
			expect(strategy.getKeyFromContext).toHaveBeenCalledWith(ctx);

			expect(strategy.rebuild).toHaveBeenCalledTimes(1);
			expect(strategy.rebuild).toHaveBeenCalledWith(list);

			expect(strategy.getHash).toHaveBeenCalledTimes(1);
			expect(strategy.getHash).toHaveBeenCalledWith("key");

			expect(strategy.getNodeIDByKey).toHaveBeenCalledTimes(1);
			expect(strategy.getNodeIDByKey).toHaveBeenCalledWith(123456);
		});

		it("should return a specified item", () => {
			strategy.needRebuild = false;
			strategy.getKeyFromContext.mockClear();
			strategy.rebuild.mockClear();
			strategy.getHash.mockClear();
			strategy.getNodeIDByKey.mockClear();

			const list = [
				{ id: "node-100" },
				{ id: "node-200" },
				{ id: "node-300" },
				{ id: "node-400" },
				{ id: "node-500" },
			];
			strategy.getNodeIDByKey = jest.fn(() => "node-300");

			expect(strategy.select(list, ctx)).toBe(list[2]);

			expect(strategy.getKeyFromContext).toHaveBeenCalledTimes(1);
			expect(strategy.getKeyFromContext).toHaveBeenCalledWith(ctx);

			expect(strategy.rebuild).toHaveBeenCalledTimes(0);

			expect(strategy.getHash).toHaveBeenCalledTimes(1);
			expect(strategy.getHash).toHaveBeenCalledWith("key");

			expect(strategy.getNodeIDByKey).toHaveBeenCalledTimes(1);
			expect(strategy.getNodeIDByKey).toHaveBeenCalledWith(123456);
		});
	});

	describe("Test getNodeIDByKey", () => {
		const broker = new ServiceBroker({ logger: false });

		const strategy = new ShardStrategy({
			opts: {
				strategyOptions: {
					ringSize: 1000
				}
			}
		}, broker);

		const list = [
			{ id: "node-100" },
			{ id: "node-200" },
			{ id: "node-300" },
			{ id: "node-400" },
			{ id: "node-500" },
		];

		strategy.rebuild(list);

		it("should find in rings and save to cache", () => {
			expect(strategy.cache.size).toBe(0);
			expect(strategy.getNodeIDByKey(345)).toBe("node-300");
			expect(strategy.cache.size).toBe(1);
		});

		it("should give the last element", () => {
			expect(strategy.getNodeIDByKey(2000)).toBe("node-500");
		});

		it("should find in cache", () => {
			strategy.ring.length = 0;
			expect(strategy.getNodeIDByKey(345)).toBe("node-300");
			expect(strategy.cache.size).toBe(2);
			expect(strategy.getNodeIDByKey(456)).toBe(null);
		});

		it("should clear cache when rebuild called", () => {
			strategy.rebuild(list);
			expect(strategy.cache.size).toBe(0);
		});

	});

});
