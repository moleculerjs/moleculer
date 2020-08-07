"use strict";

const ShardStrategy = require("../../../src/strategies/shard");
const ServiceBroker = require("../../../src/service-broker");
const Context = require("../../../src/context");
const { extendExpect } = require("../utils");

extendExpect(expect);

describe("Test ShardStrategy", () => {

	describe("Test constructor", () => {
		const broker = new ServiceBroker({ logger: false });
		jest.spyOn(broker.localBus, "on");

		it("test with empty opts", () => {

			let strategy = new ShardStrategy(broker.registry, broker);

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

			let strategy = new ShardStrategy(broker.registry, broker, {
				shardKey: "#branchID",
				vnodes: 20,
				ringSize: 100,
				cacheSize: 2000
			});

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

			let strategy = new ShardStrategy(broker.registry, broker, {});

			expect(strategy.getKeyFromContext(ctx)).toBeNull();
		});

		it("should get param value", () => {

			let strategy = new ShardStrategy(broker.registry, broker, {
				shardKey: "a.b"
			});

			expect(strategy.getKeyFromContext(ctx)).toBe(5);
		});

		it("should get meta value", () => {

			let strategy = new ShardStrategy(broker.registry, broker, {
				shardKey: "#user.name"
			});

			expect(strategy.getKeyFromContext(ctx)).toBe("John");
		});

		it("should call custom shardKey function", () => {
			const shardKey = jest.fn(() => "12345");
			let strategy = new ShardStrategy(broker.registry, broker, {
				shardKey
			});

			expect(strategy.getKeyFromContext(ctx)).toBe("12345");
			expect(shardKey).toHaveBeenCalledTimes(1);
			expect(shardKey).toHaveBeenCalledWith(ctx);
		});
	});

	describe("Test getHash", () => {
		const broker = new ServiceBroker({ logger: false });

		it("should calc hash", () => {
			let strategy = new ShardStrategy(broker.registry, broker, {});

			expect(strategy.getHash("John")).toBe(1631623841);
			expect(strategy.getHash("Jane")).toBe(731224371);
			expect(strategy.getHash("Adam")).toBe(2130539036);

			expect(strategy.getHash("John")).toBe(1631623841);
			expect(strategy.getHash("Jane")).toBe(731224371);
			expect(strategy.getHash("Adam")).toBe(2130539036);
		});

		it("should calc hash", () => {
			let strategy = new ShardStrategy(broker.registry, broker, {
				ringSize: 1000
			});

			expect(strategy.getHash("John")).toBe(841);
			expect(strategy.getHash("Jane")).toBe(371);
			expect(strategy.getHash("Adam")).toBe(36);

			expect(strategy.getHash("John")).toBe(841);
			expect(strategy.getHash("Jane")).toBe(371);
			expect(strategy.getHash("Adam")).toBe(36);
		});

		it("should calc hash (moleculer-java compatibility check)", () => {
			let strategy = new ShardStrategy(broker.registry, broker, {});

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
			let strategy = new ShardStrategy(broker.registry, broker, {});

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
			let strategy = new ShardStrategy(broker.registry, broker, {});

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
			let strategy = new ShardStrategy(broker.registry, broker, {
				vnodes: 2,
				ringSize: 1000
			});

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

		const strategy = new ShardStrategy(broker.registry, broker, {});

		strategy.getKeyFromContext = jest.fn(() => null);
		strategy.rebuild = jest.fn();
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

			expect(strategy.getNodeIDByKey).toHaveBeenCalledTimes(1);
			expect(strategy.getNodeIDByKey).toHaveBeenCalledWith("key");
		});

		it("should return a specified item", () => {
			strategy.needRebuild = false;
			strategy.getKeyFromContext.mockClear();
			strategy.rebuild.mockClear();
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

			expect(strategy.getNodeIDByKey).toHaveBeenCalledTimes(1);
			expect(strategy.getNodeIDByKey).toHaveBeenCalledWith("key");
		});
	});

	describe("Test getNodeIDByKey", () => {
		const broker = new ServiceBroker({ logger: false });

		const strategy = new ShardStrategy(broker.registry, broker, {
			ringSize: 1000
		});

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
			expect(strategy.getNodeIDByKey(345)).toBe("node-200");
			expect(strategy.cache.length).toBe(1);
		});

		it("should give the last element", () => {
			expect(strategy.getNodeIDByKey(2000)).toBe("node-500");
		});

		it("should find in cache", () => {
			strategy.ring.length = 0;
			expect(strategy.getNodeIDByKey(345)).toBe("node-200");
			expect(strategy.cache.length).toBe(2);
			expect(strategy.getNodeIDByKey(456)).toBe(null);
		});

		it("should clear cache when rebuild called", () => {
			strategy.rebuild(list);
			expect(strategy.cache.length).toBe(0);
		});

	});

	describe("Test getNodeIDByKey by keys (moleculer-java compatibility check)", () => {
		const broker = new ServiceBroker({ logger: false });

		const strategy = new ShardStrategy(broker.registry, broker, {
			vnodes: 7,
			ringSize: 3001
		});

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
			expect(strategy.getNodeIDByKey("70f83f5064f4d")).toBe("node4");
			expect(strategy.getNodeIDByKey("e1f07ea102414e1f07ea104fd0")).toBe("node6");
			expect(strategy.getNodeIDByKey("152e8bdf1ae353")).toBe("node0");
			expect(strategy.getNodeIDByKey("1c3e0fd4269a6c1c3e0fd426bc70")).toBe("node8");
			expect(strategy.getNodeIDByKey("234d93c934316d234d93c9349ec3")).toBe("node0");
			expect(strategy.getNodeIDByKey("2a5d17be439d5e2a5d17be43d7ae2a5d17be43f4dc")).toBe("node2");
			expect(strategy.getNodeIDByKey("316c9bb353eef0")).toBe("node5");
			expect(strategy.getNodeIDByKey("387c1fa8667440387c1fa866c200")).toBe("node3");
			expect(strategy.getNodeIDByKey("3f8ba39d79c0cb")).toBe("node3");
			expect(strategy.getNodeIDByKey("469b27928e1156469b27928e6660469b27928f1c9a")).toBe("node1");
			expect(strategy.getNodeIDByKey("4daaab87a576564daaab87a5e149")).toBe("node7");
			expect(strategy.getNodeIDByKey("54ba2f7cbd0bf4")).toBe("node7");
			expect(strategy.getNodeIDByKey("5bc9b371d70ac9")).toBe("node6");
			expect(strategy.getNodeIDByKey("62d93766f16ac862d93766f1f2d862d93766f236e0")).toBe("node5");
			expect(strategy.getNodeIDByKey("69e8bb5c0e0d11")).toBe("node6");
			expect(strategy.getNodeIDByKey("70f83f512ad640")).toBe("node0");
			expect(strategy.getNodeIDByKey("7807c3471b4ca7")).toBe("node0");
			expect(strategy.getNodeIDByKey("7f17473c4a91fa7f17473c4b56c87f17473c4bae40")).toBe("node0");
			expect(strategy.getNodeIDByKey("8626cb317880998626cb3179c3d2")).toBe("node2");
			expect(strategy.getNodeIDByKey("8d364f26a8e2408d364f26a98c548d364f26aa4eb4")).toBe("node4");
			expect(strategy.getNodeIDByKey("9445d31bd97a85")).toBe("node0");
			expect(strategy.getNodeIDByKey("9b555711e7c24a")).toBe("node6");
			expect(strategy.getNodeIDByKey("a264db0733382f")).toBe("node5");
			expect(strategy.getNodeIDByKey("a9745efc715838")).toBe("node0");
			expect(strategy.getNodeIDByKey("b083e2f1dd5c80")).toBe("node5");
			expect(strategy.getNodeIDByKey("b79366e725e138b79366e726fd7eb79366e7279b6c")).toBe("node3");
			expect(strategy.getNodeIDByKey("bea2eadc89a4cfbea2eadc8aecd1")).toBe("node7");
			expect(strategy.getNodeIDByKey("c5b26ed1d43518c5b26ed1d54538c5b26ed1d5ef4c")).toBe("node6");
			expect(strategy.getNodeIDByKey("ccc1f2c71e6b81ccc1f2c71f3ee3")).toBe("node3");
			expect(strategy.getNodeIDByKey("d3d176bc67833cd3d176bc68825a")).toBe("node2");
			expect(strategy.getNodeIDByKey("dae0fab1b4d1c5")).toBe("node0");
			expect(strategy.getNodeIDByKey("e1f07ea6ffa3c0e1f07ea700dac0")).toBe("node8");
			expect(strategy.getNodeIDByKey("e900029c4f1ebbe900029c50375ce900029c50ffcf")).toBe("node6");
			expect(strategy.getNodeIDByKey("f00f86919e3fd6")).toBe("node7");
			expect(strategy.getNodeIDByKey("f71f0a86ec89cd")).toBe("node3");
			expect(strategy.getNodeIDByKey("fe2e8e7c3dbb68fe2e8e7c3eed8c")).toBe("node6");
			expect(strategy.getNodeIDByKey("1053e127193339c1053e1271946e411053e1271954f00")).toBe("node0");
			expect(strategy.getNodeIDByKey("10c4d9666e7c772")).toBe("node3");
			expect(strategy.getNodeIDByKey("1135d1a5c3bd5851135d1a5c3d50b41135d1a5c3e0e38")).toBe("node4");
			expect(strategy.getNodeIDByKey("11a6c9e51948a78")).toBe("node3");
			expect(strategy.getNodeIDByKey("1217c2246ec82d4")).toBe("node0");
			expect(strategy.getNodeIDByKey("1288ba63c456230")).toBe("node3");
			expect(strategy.getNodeIDByKey("12f9b2a31b8068212f9b2a31b9dca712f9b2a31baadc6")).toBe("node5");
			expect(strategy.getNodeIDByKey("136aaae27154870136aaae27186a3c136aaae27194038")).toBe("node0");
			expect(strategy.getNodeIDByKey("13dba321c778255")).toBe("node8");
			expect(strategy.getNodeIDByKey("144c9b611f41f52144c9b611f64e26144c9b611f76590")).toBe("node8");
			expect(strategy.getNodeIDByKey("14bd93a0761790d14bd93a0764263914bd93a076c6705")).toBe("node6");
			expect(strategy.getNodeIDByKey("152e8bdfcd94d30")).toBe("node7");
			expect(strategy.getNodeIDByKey("159f841f244a9f6")).toBe("node4");
			expect(strategy.getNodeIDByKey("16107c5e7b215d016107c5e7b4387e")).toBe("node6");
			expect(strategy.getNodeIDByKey("1681749dd18e1c41681749dd1ad16c")).toBe("node8");
			expect(strategy.getNodeIDByKey("16f26cdd2881dbc")).toBe("node6");
			expect(strategy.getNodeIDByKey("1763651c7f5a32b1763651c7f7e6db1763651c7f8e867")).toBe("node6");
			expect(strategy.getNodeIDByKey("17d45d5bd610116")).toBe("node8");
			expect(strategy.getNodeIDByKey("1845559b2c9c1a61845559b2cbd82e")).toBe("node3");
			expect(strategy.getNodeIDByKey("18b64dda839c760")).toBe("node3");
			expect(strategy.getNodeIDByKey("19274619daaa2b719274619daccce8")).toBe("node8");
			expect(strategy.getNodeIDByKey("19983e59318ff4a")).toBe("node6");
			expect(strategy.getNodeIDByKey("1a09369895e39651a0936989614e0f")).toBe("node6");
			expect(strategy.getNodeIDByKey("1a7a2ed7edbc45c")).toBe("node4");
			expect(strategy.getNodeIDByKey("1aeb271744e63fe1aeb2717450b4d6")).toBe("node6");
			expect(strategy.getNodeIDByKey("1b5c1f569c5aa321b5c1f569c7b9701b5c1f569c9320a")).toBe("node1");
			expect(strategy.getNodeIDByKey("1bcd1795f447385")).toBe("node4");
			expect(strategy.getNodeIDByKey("1c3e0fd54ba5800")).toBe("node2");
			expect(strategy.getNodeIDByKey("1caf0814a3ae8ef1caf0814a3d60a7")).toBe("node6");
			expect(strategy.getNodeIDByKey("1d200053fc7d8081d200053fca5978")).toBe("node7");
			expect(strategy.getNodeIDByKey("1d90f8935427b6a1d90f89354506921d90f8935464c26")).toBe("node7");
			expect(strategy.getNodeIDByKey("1e01f0d2ac4119c1e01f0d2ac653e01e01f0d2ac89624")).toBe("node7");
			expect(strategy.getNodeIDByKey("1e72e9120455401")).toBe("node0");
			expect(strategy.getNodeIDByKey("1ee3e1515f55c781ee3e1515f859d2")).toBe("node4");
			expect(strategy.getNodeIDByKey("1f54d990b7d2a301f54d990b8493c61f54d990b8d56a7")).toBe("node1");
			expect(strategy.getNodeIDByKey("1fc5d1d01124910")).toBe("node7");
			expect(strategy.getNodeIDByKey("2036ca0f695003c2036ca0f697c5b4")).toBe("node1");
			expect(strategy.getNodeIDByKey("20a7c24ec18db46")).toBe("node3");
			expect(strategy.getNodeIDByKey("2118ba8e1a1c3da2118ba8e1a49cc2")).toBe("node7");
			expect(strategy.getNodeIDByKey("2189b2cd7a238bc2189b2cd7a5d4042189b2cd7a74554")).toBe("node7");
			expect(strategy.getNodeIDByKey("21faab0cd32764f21faab0cd35056921faab0cd367b95")).toBe("node3");
			expect(strategy.getNodeIDByKey("226ba34c2d7a6d4")).toBe("node7");
			expect(strategy.getNodeIDByKey("22dc9b8b8874bfd22dc9b8b88a4bc522dc9b8b88d4b8d")).toBe("node8");
			expect(strategy.getNodeIDByKey("234d93cae1bc1f0234d93cae1e6a40")).toBe("node6");
			expect(strategy.getNodeIDByKey("23be8c0a3a59ed9")).toBe("node5");
			expect(strategy.getNodeIDByKey("242f8449934c9f8")).toBe("node0");
			expect(strategy.getNodeIDByKey("24a07c88ebec8ed24a07c88ec3e811")).toBe("node6");
			expect(strategy.getNodeIDByKey("251174c845d4ac8251174c84601570")).toBe("node0");
			expect(strategy.getNodeIDByKey("25826d07a58d00b25826d07a5c7166")).toBe("node2");
			expect(strategy.getNodeIDByKey("25f36546fef728a")).toBe("node8");
			expect(strategy.getNodeIDByKey("26645d865824b46")).toBe("node5");
			expect(strategy.getNodeIDByKey("26d555c5b12da78")).toBe("node4");
			expect(strategy.getNodeIDByKey("27464e050a463f027464e050a7c4e827464e050a97564")).toBe("node6");
			expect(strategy.getNodeIDByKey("27b7464463dbd0e27b74644640bac2")).toBe("node2");
			expect(strategy.getNodeIDByKey("28283e83bd531d2")).toBe("node8");
			expect(strategy.getNodeIDByKey("289936c316b17c8289936c316e95e8289936c317054f8")).toBe("node2");
			expect(strategy.getNodeIDByKey("290a2f02705f821")).toBe("node3");
			expect(strategy.getNodeIDByKey("297b2741c9bb12c297b2741c9ed08a")).toBe("node7");
			expect(strategy.getNodeIDByKey("29ec1f8123fe64e")).toBe("node4");
			expect(strategy.getNodeIDByKey("2a5d17c07d98120")).toBe("node5");
			expect(strategy.getNodeIDByKey("2ace0fffd7243b8")).toBe("node6");
			expect(strategy.getNodeIDByKey("2b3f083f3145b18")).toBe("node6");
			expect(strategy.getNodeIDByKey("2bb0007e8af96a82bb0007e8b358d02bb0007e8b5b229")).toBe("node0");
			expect(strategy.getNodeIDByKey("2c20f8bde5af9902c20f8bde5ec570")).toBe("node0");
		});

	});

});
