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

Suite: Set & get 1k data with same key
√ Memory*            2,465,247 rps
√ Memory LRU*        2,232,480 rps
√ Redis*                12,186 rps

   Memory*               0%      (2,465,247 rps)   (avg: 405ns)
   Memory LRU*       -9.44%      (2,232,480 rps)   (avg: 447ns)
   Redis*           -99.51%         (12,186 rps)   (avg: 82μs)
-----------------------------------------------------------------------

Suite: Set & get 1k data with new keys
√ Memory*              594,307 rps
√ Memory LRU*          429,190 rps
√ Redis*                 9,733 rps

   Memory*               0%        (594,307 rps)   (avg: 1μs)
   Memory LRU*      -27.78%        (429,190 rps)   (avg: 2μs)
   Redis*           -98.36%          (9,733 rps)   (avg: 102μs)
-----------------------------------------------------------------------

Suite: Test getCacheKey
√ Dynamic         2,393,832 rps
√ Static          6,995,847 rps

   Dynamic       -65.78%      (2,393,832 rps)   (avg: 417ns)
   Static             0%      (6,995,847 rps)   (avg: 142ns)
-----------------------------------------------------------------------

Suite: Test cloning on MemoryCacher
√ Without cloning*        4,158,500 rps
√ With cloning*             185,395 rps

   Without cloning*           0%      (4,158,500 rps)   (avg: 240ns)
   With cloning*         -95.54%        (185,395 rps)   (avg: 5μs)
-----------------------------------------------------------------------



*/
