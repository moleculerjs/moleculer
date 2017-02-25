"use strict";

//let _ = require("lodash");

let Promise	= require("bluebird");
let { getDataFile } = require("../utils");

let Benchmarkify = require("benchmarkify");
Benchmarkify.printHeader("Cachers benchmark");

let ServiceBroker = require("../../src/service-broker");
let MemoryCacher = require("../../src/cachers/memory");
let MemoryMapCacher = require("../../src/cachers/memory-map");
let RedisCacher = require("../../src/cachers/redis");

let key = "TESTKEY-12345";

let bench = new Benchmarkify({ async: true, name: "Set & get 1k data with cacher"});
let data = JSON.parse(getDataFile("1k.json"));

let broker = new ServiceBroker();

let memCacher = new MemoryCacher();
memCacher.init(broker);

let memMapCacher = new MemoryMapCacher();
memMapCacher.init(broker);

let redisCacher = new RedisCacher({
	redis: {
		uri: "localhost:6379"
	},
	prefix: "BENCH-"
});
redisCacher.init(broker);

// ----
bench.add("Memory", () => {
	memCacher.set(key, data);
	return memCacher.get(key);	
}, false);

bench.add("MemoryMap", () => {
	memMapCacher.set(key, data);
	return memMapCacher.get(key);	
}, false);

bench.add("Redis", () => {
	return redisCacher.set(key, data).then(() => redisCacher.get(key));	
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
   Node.JS: 6.9.2
   V8: 5.1.281.88
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

Suite: Set & get 1k data with cacher
√ Memory x 30,479,178 ops/sec ±0.47% (95 runs sampled)
√ MemoryMap x 10,633,889 ops/sec ±0.29% (95 runs sampled)
√ Redis x 7,621 ops/sec ±1.54% (83 runs sampled)

   Memory        0.00%   (30,479,178 ops/sec)
   MemoryMap   -65.11%   (10,633,889 ops/sec)
   Redis       -99.97%      (7,621 ops/sec)
-----------------------------------------------------------------------

*/