"use strict";

let ShardStrategy = require("../../../src/strategies/shard");
let ServiceBroker = require("../../../src/service-broker");
let Context = require("../../../src/context");
let { extendExpect } = require("../utils");

extendExpect(expect);

describe("Test ShardStrategy", () => {
/*
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

			expect(strategy.cache).toBeDefined();
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

			expect(strategy.cache).toBeDefined();
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
	});*/

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
			expect(strategy.cache.length).toBe(0);
			expect(strategy.getNodeIDByKey(345)).toBe("node-300");
			expect(strategy.cache.length).toBe(1);
		});

		it("should give the last element", () => {
			expect(strategy.getNodeIDByKey(2000)).toBe("node-500");
		});

		it("should find in cache", () => {
			strategy.ring.length = 0;
			expect(strategy.getNodeIDByKey(345)).toBe("node-300");
			expect(strategy.cache.length).toBe(2);
			expect(strategy.getNodeIDByKey(456)).toBe(null);
		});

		it("should clear cache when rebuild called", () => {
			strategy.rebuild(list);
			expect(strategy.cache.length).toBe(0);
		});

	});

	describe("Test getNodeIDByKey by keys (moleculer-java compatibility test)", () => {
		const broker = new ServiceBroker({ logger: false });

		const strategy = new ShardStrategy({
			opts: {
				strategyOptions: {
					vnodes: 7,
					ringSize: 3001
				}
			}
		}, broker);

		const list = [
			{ id: "node0" },
			{ id: "node1" },
			{ id: "node2" },
			{ id: "node3" },
			{ id: "node4" },
			{ id: "node5" },
			{ id: "node6" },
			{ id: "node7" },
			{ id: "node8" },
		];

		strategy.rebuild(list);

		//strategy.ring.forEach(item => console.log(`${item.nodeID}: ${item.key}`));

		it("should find the correct nodeID by key", () => {
			expect(strategy.getNodeIDByKey(strategy.getHash("70f83f5064f4d"))).toBe("node4");
			expect(strategy.getNodeIDByKey(strategy.getHash("e1f07ea102414e1f07ea104fd0"))).toBe("node6");
			expect(strategy.getNodeIDByKey(strategy.getHash("152e8bdf1ae353"))).toBe("node0");
			expect(strategy.getNodeIDByKey(strategy.getHash("1c3e0fd4269a6c1c3e0fd426bc70"))).toBe("node8");
			expect(strategy.getNodeIDByKey(strategy.getHash("234d93c934316d234d93c9349ec3"))).toBe("node0");
			expect(strategy.getNodeIDByKey(strategy.getHash("2a5d17be439d5e2a5d17be43d7ae2a5d17be43f4dc"))).toBe("node2");
			expect(strategy.getNodeIDByKey(strategy.getHash("316c9bb353eef0"))).toBe("node5");
			expect(strategy.getNodeIDByKey(strategy.getHash("387c1fa8667440387c1fa866c200"))).toBe("node3");
			expect(strategy.getNodeIDByKey(strategy.getHash("3f8ba39d79c0cb"))).toBe("node3");
			expect(strategy.getNodeIDByKey(strategy.getHash("469b27928e1156469b27928e6660469b27928f1c9a"))).toBe("node1");
			expect(strategy.getNodeIDByKey(strategy.getHash("4daaab87a576564daaab87a5e149"))).toBe("node7");
			expect(strategy.getNodeIDByKey(strategy.getHash("54ba2f7cbd0bf4"))).toBe("node7");
			expect(strategy.getNodeIDByKey(strategy.getHash("5bc9b371d70ac9"))).toBe("node6");
			expect(strategy.getNodeIDByKey(strategy.getHash("62d93766f16ac862d93766f1f2d862d93766f236e0"))).toBe("node5");
			expect(strategy.getNodeIDByKey(strategy.getHash("69e8bb5c0e0d11"))).toBe("node6");
			expect(strategy.getNodeIDByKey(strategy.getHash("70f83f512ad640"))).toBe("node0");
			expect(strategy.getNodeIDByKey(strategy.getHash("7807c3471b4ca7"))).toBe("node0");
			expect(strategy.getNodeIDByKey(strategy.getHash("7f17473c4a91fa7f17473c4b56c87f17473c4bae40"))).toBe("node0");
			expect(strategy.getNodeIDByKey(strategy.getHash("8626cb317880998626cb3179c3d2"))).toBe("node2");
			expect(strategy.getNodeIDByKey(strategy.getHash("8d364f26a8e2408d364f26a98c548d364f26aa4eb4"))).toBe("node4");
			expect(strategy.getNodeIDByKey(strategy.getHash("9445d31bd97a85"))).toBe("node0");
			expect(strategy.getNodeIDByKey(strategy.getHash("9b555711e7c24a"))).toBe("node6");
			expect(strategy.getNodeIDByKey(strategy.getHash("a264db0733382f"))).toBe("node5");
			expect(strategy.getNodeIDByKey(strategy.getHash("a9745efc715838"))).toBe("node0");
			expect(strategy.getNodeIDByKey(strategy.getHash("b083e2f1dd5c80"))).toBe("node5");
			expect(strategy.getNodeIDByKey(strategy.getHash("b79366e725e138b79366e726fd7eb79366e7279b6c"))).toBe("node3");
			expect(strategy.getNodeIDByKey(strategy.getHash("bea2eadc89a4cfbea2eadc8aecd1"))).toBe("node7");
			expect(strategy.getNodeIDByKey(strategy.getHash("c5b26ed1d43518c5b26ed1d54538c5b26ed1d5ef4c"))).toBe("node6");
			expect(strategy.getNodeIDByKey(strategy.getHash("ccc1f2c71e6b81ccc1f2c71f3ee3"))).toBe("node3");
			expect(strategy.getNodeIDByKey(strategy.getHash("d3d176bc67833cd3d176bc68825a"))).toBe("node2");
			expect(strategy.getNodeIDByKey(strategy.getHash("dae0fab1b4d1c5"))).toBe("node0");
			expect(strategy.getNodeIDByKey(strategy.getHash("e1f07ea6ffa3c0e1f07ea700dac0"))).toBe("node8");
			expect(strategy.getNodeIDByKey(strategy.getHash("e900029c4f1ebbe900029c50375ce900029c50ffcf"))).toBe("node6");
			expect(strategy.getNodeIDByKey(strategy.getHash("f00f86919e3fd6"))).toBe("node7");
			expect(strategy.getNodeIDByKey(strategy.getHash("f71f0a86ec89cd"))).toBe("node3");
			expect(strategy.getNodeIDByKey(strategy.getHash("fe2e8e7c3dbb68fe2e8e7c3eed8c"))).toBe("node6");
			expect(strategy.getNodeIDByKey(strategy.getHash("1053e127193339c1053e1271946e411053e1271954f00"))).toBe("node0");
			expect(strategy.getNodeIDByKey(strategy.getHash("10c4d9666e7c772"))).toBe("node3");
			expect(strategy.getNodeIDByKey(strategy.getHash("1135d1a5c3bd5851135d1a5c3d50b41135d1a5c3e0e38"))).toBe("node4");
			expect(strategy.getNodeIDByKey(strategy.getHash("11a6c9e51948a78"))).toBe("node3");
			expect(strategy.getNodeIDByKey(strategy.getHash("1217c2246ec82d4"))).toBe("node0");
			expect(strategy.getNodeIDByKey(strategy.getHash("1288ba63c456230"))).toBe("node3");
			expect(strategy.getNodeIDByKey(strategy.getHash("12f9b2a31b8068212f9b2a31b9dca712f9b2a31baadc6"))).toBe("node5");
			expect(strategy.getNodeIDByKey(strategy.getHash("136aaae27154870136aaae27186a3c136aaae27194038"))).toBe("node0");
			expect(strategy.getNodeIDByKey(strategy.getHash("13dba321c778255"))).toBe("node8");
			expect(strategy.getNodeIDByKey(strategy.getHash("144c9b611f41f52144c9b611f64e26144c9b611f76590"))).toBe("node8");
			expect(strategy.getNodeIDByKey(strategy.getHash("14bd93a0761790d14bd93a0764263914bd93a076c6705"))).toBe("node6");
			expect(strategy.getNodeIDByKey(strategy.getHash("152e8bdfcd94d30"))).toBe("node7");
			expect(strategy.getNodeIDByKey(strategy.getHash("159f841f244a9f6"))).toBe("node4");
			expect(strategy.getNodeIDByKey(strategy.getHash("16107c5e7b215d016107c5e7b4387e"))).toBe("node6");
			expect(strategy.getNodeIDByKey(strategy.getHash("1681749dd18e1c41681749dd1ad16c"))).toBe("node8");
			expect(strategy.getNodeIDByKey(strategy.getHash("16f26cdd2881dbc"))).toBe("node6");
			expect(strategy.getNodeIDByKey(strategy.getHash("1763651c7f5a32b1763651c7f7e6db1763651c7f8e867"))).toBe("node6");
			expect(strategy.getNodeIDByKey(strategy.getHash("17d45d5bd610116"))).toBe("node8");
			expect(strategy.getNodeIDByKey(strategy.getHash("1845559b2c9c1a61845559b2cbd82e"))).toBe("node3");
			expect(strategy.getNodeIDByKey(strategy.getHash("18b64dda839c760"))).toBe("node3");
			expect(strategy.getNodeIDByKey(strategy.getHash("19274619daaa2b719274619daccce8"))).toBe("node8");
			expect(strategy.getNodeIDByKey(strategy.getHash("19983e59318ff4a"))).toBe("node6");
			expect(strategy.getNodeIDByKey(strategy.getHash("1a09369895e39651a0936989614e0f"))).toBe("node6");
			expect(strategy.getNodeIDByKey(strategy.getHash("1a7a2ed7edbc45c"))).toBe("node4");
			expect(strategy.getNodeIDByKey(strategy.getHash("1aeb271744e63fe1aeb2717450b4d6"))).toBe("node6");
			expect(strategy.getNodeIDByKey(strategy.getHash("1b5c1f569c5aa321b5c1f569c7b9701b5c1f569c9320a"))).toBe("node1");
			expect(strategy.getNodeIDByKey(strategy.getHash("1bcd1795f447385"))).toBe("node4");
			expect(strategy.getNodeIDByKey(strategy.getHash("1c3e0fd54ba5800"))).toBe("node2");
			expect(strategy.getNodeIDByKey(strategy.getHash("1caf0814a3ae8ef1caf0814a3d60a7"))).toBe("node6");
			expect(strategy.getNodeIDByKey(strategy.getHash("1d200053fc7d8081d200053fca5978"))).toBe("node7");
			expect(strategy.getNodeIDByKey(strategy.getHash("1d90f8935427b6a1d90f89354506921d90f8935464c26"))).toBe("node7");
			expect(strategy.getNodeIDByKey(strategy.getHash("1e01f0d2ac4119c1e01f0d2ac653e01e01f0d2ac89624"))).toBe("node7");
			expect(strategy.getNodeIDByKey(strategy.getHash("1e72e9120455401"))).toBe("node0");
			expect(strategy.getNodeIDByKey(strategy.getHash("1ee3e1515f55c781ee3e1515f859d2"))).toBe("node4");
			expect(strategy.getNodeIDByKey(strategy.getHash("1f54d990b7d2a301f54d990b8493c61f54d990b8d56a7"))).toBe("node1");
			expect(strategy.getNodeIDByKey(strategy.getHash("1fc5d1d01124910"))).toBe("node7");
			expect(strategy.getNodeIDByKey(strategy.getHash("2036ca0f695003c2036ca0f697c5b4"))).toBe("node1");
			expect(strategy.getNodeIDByKey(strategy.getHash("20a7c24ec18db46"))).toBe("node3");
			expect(strategy.getNodeIDByKey(strategy.getHash("2118ba8e1a1c3da2118ba8e1a49cc2"))).toBe("node7");
			expect(strategy.getNodeIDByKey(strategy.getHash("2189b2cd7a238bc2189b2cd7a5d4042189b2cd7a74554"))).toBe("node7");
			expect(strategy.getNodeIDByKey(strategy.getHash("21faab0cd32764f21faab0cd35056921faab0cd367b95"))).toBe("node3");
			expect(strategy.getNodeIDByKey(strategy.getHash("226ba34c2d7a6d4"))).toBe("node7");
			expect(strategy.getNodeIDByKey(strategy.getHash("22dc9b8b8874bfd22dc9b8b88a4bc522dc9b8b88d4b8d"))).toBe("node8");
			expect(strategy.getNodeIDByKey(strategy.getHash("234d93cae1bc1f0234d93cae1e6a40"))).toBe("node6");
			expect(strategy.getNodeIDByKey(strategy.getHash("23be8c0a3a59ed9"))).toBe("node5");
			expect(strategy.getNodeIDByKey(strategy.getHash("242f8449934c9f8"))).toBe("node0");
			expect(strategy.getNodeIDByKey(strategy.getHash("24a07c88ebec8ed24a07c88ec3e811"))).toBe("node6");
			expect(strategy.getNodeIDByKey(strategy.getHash("251174c845d4ac8251174c84601570"))).toBe("node0");
			expect(strategy.getNodeIDByKey(strategy.getHash("25826d07a58d00b25826d07a5c7166"))).toBe("node2");
			expect(strategy.getNodeIDByKey(strategy.getHash("25f36546fef728a"))).toBe("node8");
			expect(strategy.getNodeIDByKey(strategy.getHash("26645d865824b46"))).toBe("node5");
			expect(strategy.getNodeIDByKey(strategy.getHash("26d555c5b12da78"))).toBe("node4");
			expect(strategy.getNodeIDByKey(strategy.getHash("27464e050a463f027464e050a7c4e827464e050a97564"))).toBe("node6");
			expect(strategy.getNodeIDByKey(strategy.getHash("27b7464463dbd0e27b74644640bac2"))).toBe("node2");
			expect(strategy.getNodeIDByKey(strategy.getHash("28283e83bd531d2"))).toBe("node8");
			expect(strategy.getNodeIDByKey(strategy.getHash("289936c316b17c8289936c316e95e8289936c317054f8"))).toBe("node2");
			expect(strategy.getNodeIDByKey(strategy.getHash("290a2f02705f821"))).toBe("node3");
			expect(strategy.getNodeIDByKey(strategy.getHash("297b2741c9bb12c297b2741c9ed08a"))).toBe("node7");
			expect(strategy.getNodeIDByKey(strategy.getHash("29ec1f8123fe64e"))).toBe("node4");
			expect(strategy.getNodeIDByKey(strategy.getHash("2a5d17c07d98120"))).toBe("node5");
			expect(strategy.getNodeIDByKey(strategy.getHash("2ace0fffd7243b8"))).toBe("node6");
			expect(strategy.getNodeIDByKey(strategy.getHash("2b3f083f3145b18"))).toBe("node6");
			expect(strategy.getNodeIDByKey(strategy.getHash("2bb0007e8af96a82bb0007e8b358d02bb0007e8b5b229"))).toBe("node0");
			expect(strategy.getNodeIDByKey(strategy.getHash("2c20f8bde5af9902c20f8bde5ec570"))).toBe("node0");
		});

	});

});
