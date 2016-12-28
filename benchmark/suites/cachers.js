"use strict";

let fs = require("fs");
let _ = require("lodash");
let chalk = require("chalk");
let Benchmark = require("benchmark");
let ServiceBroker = require("../../src/service-broker");
let MemoryCacher = require("../../src/cachers/memory");
let RedisCacher = require("../../src/cachers/redis");

let Benchmarker = require("../benchmarker");
Benchmarker.printHeader("Cachers benchmark");

let key = "TESTKEY-12345";

let bench = new Benchmarker({ async: true, name: "Set & get 50k data with cacher"});
let data = bench.getDataFile("50k.json");

let broker = new ServiceBroker();

let memCacher = new MemoryCacher({
	prefix: "BENCH-"
});
memCacher.init(broker);

let redisCacher = new RedisCacher({
	redis: {
		uri: "localhost:6379"
	},
	prefix: "BENCH-"
});
redisCacher.init(broker);

// ----
bench.add("Memory", () => {
	return memCacher.set(key, data).then(() => memCacher.get(key));	
});

bench.add("Redis", () => {
	return redisCacher.set(key, data).then(() => redisCacher.get(key));	
});

bench.run().then(() => {
	redisCacher.close();
});
