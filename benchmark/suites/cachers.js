"use strict";

let { getDataFile } = require("../utils");

let Benchmarkify = require("benchmarkify");
let benchmark = new Benchmarkify("Cachers benchmark").printHeader();

let Moleculer = require("../../");

let key = "TESTKEY-12345";

let bench1 = benchmark.createSuite("Set & get 1k data with cacher");
let data = JSON.parse(getDataFile("1k.json"));

let broker = new Moleculer.ServiceBroker();

let memCacher = new Moleculer.Cachers.Memory();
memCacher.init(broker);

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

bench1.add("Redis", done => {
	redisCacher.set(key, data).then(() => redisCacher.get(key)).then(done);
});

let bench2 = benchmark.createSuite("Test getCacheKey");

bench2.add("Dynamic", () => {
	return memCacher.getCacheKey("user", { id: 5 }, null);
});

bench2.add("Static", () => {
	return memCacher.getCacheKey("user", { id: 5 }, null, ["id"]);
});

benchmark.run([bench1, bench2]).then(() => {
	redisCacher.close();
});


/*
=====================
  Cachers benchmark
=====================

Platform info:
==============
   Windows_NT 6.1.7601 x64
   Node.JS: 6.11.4
   V8: 5.1.281.108
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

Suite: Set & get 1k data with cacher
√ Memory*        1,434,441 rps
√ Redis*            11,464 rps

   Memory*           0%      (1,434,441 rps)   (avg: 697ns)
   Redis*        -99.2%         (11,464 rps)   (avg: 87μs)
-----------------------------------------------------------------------

Suite: Test getCacheKey
√ Dynamic           535,623 rps
√ Static          4,159,573 rps

   Dynamic       -87.12%        (535,623 rps)   (avg: 1μs)
   Static             0%      (4,159,573 rps)   (avg: 240ns)
-----------------------------------------------------------------------


*/
