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

		it("should calc hash (moleculer-java check)", () => {
			let strategy = new ShardStrategy({
				opts: {
					strategyOptions: {}
				}
			}, broker);

			expect(strategy.getHash("0")).toBe(3486326916);
			expect(strategy.getHash("4a6b07269c41b0")).toBe(724397302);
			expect(strategy.getHash("94d60e4d4d2ac04a6b0726a757c")).toBe(1203819753);
			expect(strategy.getHash("df4115740c94904a6b0726af8b294d60e4d604d4")).toBe(1290134576);
			expect(strategy.getHash("129ac1c9ae2518")).toBe(3078036978);
			expect(strategy.getHash("1741723c1c26200")).toBe(2115014930);
			expect(strategy.getHash("1be822aeb135f804a6b07272f569")).toBe(1791083853);
			expect(strategy.getHash("208ed3212ac1b104a6b07273dfe494d60e4e7c980")).toBe(194521309);
			expect(strategy.getHash("25358393acc748")).toBe(1049237500);
			expect(strategy.getHash("29dc34062850110")).toBe(3344970316);
			expect(strategy.getHash("2e82e478a3ca4204a6b07276d393")).toBe(1059795840);
			expect(strategy.getHash("332994eb20d55d04a6b07277655d94d60e4eed472")).toBe(2268826568);
			expect(strategy.getHash("37d0455d9ed85c")).toBe(3498678610);
			expect(strategy.getHash("3c76f5d01ec4e90")).toBe(2817756008);
			expect(strategy.getHash("411da6429f104a04a6b072791d2b")).toBe(2997157689);
			expect(strategy.getHash("45c456b5200a9204a6b07279a40694d60e4f351c4")).toBe(2571292884);
			expect(strategy.getHash("4a6b0727a30f40")).toBe(1466883034);
			expect(strategy.getHash("4f11b79a2551920")).toBe(4045131562);
			expect(strategy.getHash("53b8680ca935e204a6b0727b3898")).toBe(138243266);
			expect(strategy.getHash("585f187f2e65cc04a6b0727bc0aa94d60e4f7889e")).toBe(352636368);
			expect(strategy.getHash("5d05c8f1b57e18")).toBe(2273849769);
			expect(strategy.getHash("61ac79643c54ce0")).toBe(588847511);
			expect(strategy.getHash("665329d6c4629e04a6b0727d553c")).toBe(2319755670);
			expect(strategy.getHash("6af9da494efdf304a6b0727deaab94d60e4fbdca0")).toBe(2018050882);
			expect(strategy.getHash("6fa08abbdadef8")).toBe(3263977327);
			expect(strategy.getHash("74473b2e6511dc0")).toBe(398434408);
			expect(strategy.getHash("78edeba0f0941004a6b0727f7317")).toBe(886540594);
			expect(strategy.getHash("7d949c137e97b804a6b0727ffd9794d60e5000278")).toBe(2833093651);
			expect(strategy.getHash("823b4c860d6c58")).toBe(3675093615);
			expect(strategy.getHash("86e1fcf89ca0f50")).toBe(3313150130);
			expect(strategy.getHash("8b88ad6b2dfd3e04a6b072819497")).toBe(492206794);
			expect(strategy.getHash("902f5dddbfffdd04a6b072821ca994d60e50447e6")).toBe(3760893786);
			expect(strategy.getHash("94d60e505449c0")).toBe(774442496);
			expect(strategy.getHash("997cbec2e6954c0")).toBe(2776987465);
			expect(strategy.getHash("9e236f357b9a2e04a6b07283b272")).toBe(1601659566);
			expect(strategy.getHash("a2ca1fa81256da04a6b07284394d94d60e5087c52")).toBe(3430860961);
			expect(strategy.getHash("a770d01aaa56d4")).toBe(561474753);
			expect(strategy.getHash("ac17808d40a1570")).toBe(555389561);
			expect(strategy.getHash("b0be30ffd8f3d204a6b07285c082")).toBe(3133264599);
			expect(strategy.getHash("b564e17273938404a6b0728649cb94d60e50c9ae0")).toBe(502772168);
			expect(strategy.getHash("ba0b91e50ee498")).toBe(1848953068);
			expect(strategy.getHash("beb24257a8bbdf0")).toBe(2871289633);
			expect(strategy.getHash("c358f2ca45b2b204a6b07287cd5b")).toBe(1434351094);
			expect(strategy.getHash("c7ffa33ce3b23604a6b07288509194d60e510aada")).toBe(3379603680);
			expect(strategy.getHash("cca653af8430c0")).toBe(1158327753);
			expect(strategy.getHash("d14d04222227cb0")).toBe(3603063043);
			expect(strategy.getHash("d5f3b494c2ce7404a6b07289d7c5")).toBe(1767770729);
			expect(strategy.getHash("da9a650765cfe004a6b0728a672294d60e514d7fc")).toBe(455531586);
			expect(strategy.getHash("df41157a0b4190")).toBe(3123302400);
			expect(strategy.getHash("e3e7c5ecad69610")).toBe(2096814677);
			expect(strategy.getHash("e88e765f51772604a6b0728be97a")).toBe(1752104883);
			expect(strategy.getHash("ed3526d1f7797304a6b0728c78d794d60e518fb66")).toBe(327655376);
			expect(strategy.getHash("f1dbd744a3b0fc")).toBe(2701341810);
			expect(strategy.getHash("f68287b74a97b60")).toBe(820593198);
			expect(strategy.getHash("fb293829f33d8404a6b0728e088c")).toBe(1743913596);
			expect(strategy.getHash("ffcfe89ca476c604a6b0728ebb2494d60e51d8000")).toBe(2224362458);
			expect(strategy.getHash("10476990f589040")).toBe(517707929);
			expect(strategy.getHash("1091d49820488800")).toBe(2448939331);
			expect(strategy.getHash("10dc3f9f4b20f3c04a6b072905bdc")).toBe(1948853711);
			expect(strategy.getHash("1126aaa6763f8bb04a6b07290eda794d60e521ec50")).toBe(2088765863);
			expect(strategy.getHash("117115ada16bcb0")).toBe(1005982381);
			expect(strategy.getHash("11bb80b4d03f3a10")).toBe(1953516898);
			expect(strategy.getHash("1205ebbbfc3ebd004a6b07293ba75")).toBe(735126713);
			expect(strategy.getHash("125056c327a940304a6b07294462c94d60e5289610")).toBe(3764942190);
			expect(strategy.getHash("129ac1ca539a2c0")).toBe(3265688126);
			expect(strategy.getHash("12e52cd17eeed1c0")).toBe(2603066263);
			expect(strategy.getHash("132f97d8aa6272404a6b07295f578")).toBe(3647966497);
			expect(strategy.getHash("137a02dfd5fad2c04a6b072967c5394d60e52d0260")).toBe(760845854);
			expect(strategy.getHash("13c46de707ac168")).toBe(1497570554);
			expect(strategy.getHash("140ed8ee3377f290")).toBe(1906782356);
			expect(strategy.getHash("145943f55f3a16e04a6b07299774c")).toBe(363667900);
			expect(strategy.getHash("14a3aefc8b0c54304a6b07299f94c94d60e533f9e2")).toBe(2792937459);
			expect(strategy.getHash("14ee1a03b7568d8")).toBe(1340417761);
			expect(strategy.getHash("1538850ae33f5850")).toBe(3030368299);
			expect(strategy.getHash("1582f0120f432b204a6b0729b8f14")).toBe(1417319658);
			expect(strategy.getHash("15cd5b193b7ef3a04a6b0729c185e94d60e5383a74")).toBe(403872944);
			expect(strategy.getHash("1617c62067c624c")).toBe(362880290);
			expect(strategy.getHash("1662312794187ac0")).toBe(1512282808);
			expect(strategy.getHash("16ac9c2ec075c0004a6b0729db571")).toBe(1337590107);
			expect(strategy.getHash("16f70735ed07bc104a6b0729e39de94d60e53c7d74")).toBe(2294218872);
			expect(strategy.getHash("1741723d19ab510")).toBe(188405640);
			expect(strategy.getHash("178bdd4445eba960")).toBe(795173332);
			expect(strategy.getHash("17d6484b728bad404a6b0729fc5ee")).toBe(1272205773);
			expect(strategy.getHash("1820b3529f42b2f04a6b072a0492494d60e5409c02")).toBe(3845773986);
			expect(strategy.getHash("186b1e59cc10fa0")).toBe(4023863213);
			expect(strategy.getHash("18b58960f8a2cbe0")).toBe(3551407294);
			expect(strategy.getHash("18fff46826cb9c604a6b072a20e4f")).toBe(3894737157);
			expect(strategy.getHash("194a5f6f53c905c04a6b072a29a0694d60e5453b58")).toBe(1407156978);
			expect(strategy.getHash("1994ca7685549e8")).toBe(2108634166);
			expect(strategy.getHash("19df357db25f0470")).toBe(610075097);
			expect(strategy.getHash("1a29a084e0840aa04a6b072a51b81")).toBe(2132423929);
			expect(strategy.getHash("1a740b8c0db198b04a6b072a59d8094d60e54b44ba")).toBe(3311734549);
			expect(strategy.getHash("1abe769340e22b0")).toBe(2392290243);
			expect(strategy.getHash("1b08e19a6f691170")).toBe(4073617810);
			expect(strategy.getHash("1b534ca19d6967204a6b072a87407")).toBe(3372201925);
			expect(strategy.getHash("1b9db7a8cb2d8d104a6b072a8ffbe94d60e55206c6")).toBe(3357340148);
			expect(strategy.getHash("1be822aff8d01e0")).toBe(85270405);
			expect(strategy.getHash("1c328db726235700")).toBe(3304207601);
			expect(strategy.getHash("1c7cf8be53b913804a6b072aa724b")).toBe(828887894);
			expect(strategy.getHash("1cc763c5816d56204a6b072aaef6e94d60e555e626")).toBe(3600310098);
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

});
