"use strict";

let { getDataFile } = require("../utils");

let Benchmarkify = require("benchmarkify");
let benchmark = new Benchmarkify("Cachers benchmark").printHeader();

let Moleculer = require("../../");

let key = "TESTKEY-12345";

let bench1 = benchmark.createSuite("Set & get 1k data with same key");
let bench2 = benchmark.createSuite("Set & get 1k data with new keys");

let data = JSON.parse(getDataFile("1k.json"));

let broker = new Moleculer.ServiceBroker({ logger: false });

let memCacher = new Moleculer.Cachers.Memory();
memCacher.init(broker);

let memLruCacher = new Moleculer.Cachers.MemoryLRU();
memLruCacher.init(broker);

let memCacherCloning = new Moleculer.Cachers.Memory({ clone: true });
memCacherCloning.init(broker);

let redisCacher = new Moleculer.Cachers.Redis({
	redis: {
		uri: "localhost:6379"
	},
	prefix: "BENCH-"
});
redisCacher.init(broker);


// ----
bench1.add("Memory", done => {
	memCacher.set(key, data).then(() => memCacher.get(key)).then(done);
});

bench1.add("Memory LRU", done => {
	memLruCacher.set(key, data).then(() => memLruCacher.get(key)).then(done);
});

bench1.add("Redis", done => {
	redisCacher.set(key, data).then(() => redisCacher.get(key)).then(done);
});

let c = 1000000;

bench2.add("Memory", done => {
	let key = "TESTKEY-" + (c++);
	memCacher.set(key, data).then(() => memCacher.get(key)).then(done);
});

bench2.add("Memory LRU", done => {
	let key = "TESTKEY-" + (c++);
	memLruCacher.set(key, data).then(() => memLruCacher.get(key)).then(done);
});

bench2.add("Redis", done => {
	let key = "TESTKEY-" + (c++);
	redisCacher.set(key, data).then(() => redisCacher.get(key)).then(done);
});

let bench3 = benchmark.createSuite("Test getCacheKey");

bench3.add("Dynamic", () => {
	return memCacher.getCacheKey("user", { id: 5 }, null);
});

bench3.add("Static", () => {
	return memCacher.getCacheKey("user", { id: 5 }, null, ["id"]);
});

let bench4 = benchmark.createSuite("Test cloning on MemoryCacher");
memCacher.set(key, data);
memCacherCloning.set(key, data);

bench4.add("Without cloning", done => {
	memCacher.get(key).then(done);
});

bench4.add("With cloning", done => {
	memCacherCloning.get(key).then(done);
});

benchmark.run([bench1, bench2, bench3, bench4]).then(() => {
	redisCacher.close();
});


/*
=====================
  Cachers benchmark
=====================

Platform info:
==============
   Windows_NT 6.1.7601 x64
   Node.JS: 8.11.0
   V8: 6.2.414.50
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

Suite: Set & get 1k data with cacher
√ Memory*        2,233,922 rps
√ Redis*            10,729 rps

   Memory*           0%      (2,233,922 rps)   (avg: 447ns)
   Redis*       -99.52%         (10,729 rps)   (avg: 93μs)
-----------------------------------------------------------------------

Suite: Test getCacheKey
√ Dynamic         2,783,031 rps
√ Static          6,787,824 rps

   Dynamic          -59%      (2,783,031 rps)   (avg: 359ns)
   Static             0%      (6,787,824 rps)   (avg: 147ns)
-----------------------------------------------------------------------

Suite: Test cloning on MemoryCacher
√ Without cloning*        4,608,810 rps
√ With cloning*             182,449 rps

   Without cloning*           0%      (4,608,810 rps)   (avg: 216ns)
   With cloning*         -96.04%        (182,449 rps)   (avg: 5μs)
-----------------------------------------------------------------------


*/
