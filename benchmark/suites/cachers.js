"use strict";

//let _ = require("lodash");

let Promise	= require("bluebird");
let { getDataFile } = require("../utils");

let Benchmarkify = require("benchmarkify");
let benchmark = new Benchmarkify("Cachers benchmark").printHeader();

let Moleculer = require("../../");
let MemoryMapCacher = require("../../src/cachers/memory-map");

let key = "TESTKEY-12345";

let bench = benchmark.createSuite("Set & get 1k data with cacher");
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
bench.add("Memory", done => {
	memCacher.set(key, data);
	memCacher.get(key).then(done);
});

bench.add("MemoryMap", () => {
	memMapCacher.set(key, data);
	return memMapCacher.get(key);	
});

bench.add("Redis", done => {
	redisCacher.set(key, data).then(() => redisCacher.get(key)).then(done);
});

bench.run().then(() => {
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
√ Memory x 31,168,462 ops/sec ±0.30% (94 runs sampled)
√ MemoryMap x 10,502,479 ops/sec ±1.19% (94 runs sampled)
√ Redis x 7,568 ops/sec ±1.52% (83 runs sampled)

   Memory        0.00%   (31,168,462 ops/sec)
   MemoryMap   -66.30%   (10,502,479 ops/sec)
   Redis       -99.98%      (7,568 ops/sec)
-----------------------------------------------------------------------

*/