"use strict";

//let _ = require("lodash");

let Promise	= require("bluebird");
let { getDataFile } = require("../utils");

let Benchmarkify = require("benchmarkify");
let benchmark = new Benchmarkify("Cachers benchmark").printHeader();

let Moleculer = require("../../");
let MemoryMapCacher = require("../../src/cachers/memory-map");

let key = "TESTKEY-12345";

let bench1 = benchmark.createSuite("Set & get 1k data with cacher");
let data = JSON.parse(getDataFile("1k.json"));

let broker = new Moleculer.ServiceBroker();

let memCacher = new Moleculer.Cachers.Memory();
memCacher.init(broker);

let memMapCacher = new MemoryMapCacher();
memMapCacher.init(broker);

let redisCacher = new Moleculer.Cachers.Redis({
	redis: {
		uri: "localhost:6379"
	},
	prefix: "BENCH-"
});
redisCacher.init(broker);

// ----
bench1.add("Memory", done => {
	memCacher.set(key, data);
	memCacher.get(key).then(done);
});

bench1.add("MemoryMap", () => {
	memMapCacher.set(key, data);
	return memMapCacher.get(key);	
});

bench1.add("Redis", done => {
	redisCacher.set(key, data).then(() => redisCacher.get(key)).then(done);
});

let bench2 = benchmark.createSuite("Test getCacheKey");

bench2.add("Dynamic", () => {
	return memCacher.getCacheKey("user", { id: 5 });
});

bench2.add("Static", () => {
	return memCacher.getCacheKey("user", { id: 5 }, ["id"]);
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
   Node.JS: 6.10.0
   V8: 5.1.281.93
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

Suite: Set & get 1k data with cacher
√ Memory*           1,949,992 rps
√ MemoryMap         4,753,352 rps
√ Redis*               11,533 rps

   Memory*         -58.98%      (1,949,992 rps)   (avg: 512ns)
   MemoryMap            0%      (4,753,352 rps)   (avg: 210ns)
   Redis*          -99.76%         (11,533 rps)   (avg: 86μs)
-----------------------------------------------------------------------

Suite: Test getCacheKey
√ Dynamic           534,814 rps
√ Static          1,684,070 rps

   Dynamic       -68.24%        (534,814 rps)   (avg: 1μs)
   Static             0%      (1,684,070 rps)   (avg: 593ns)
-----------------------------------------------------------------------

*/