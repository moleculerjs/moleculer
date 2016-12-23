"use strict";

let fs = require("fs");
let _ = require("lodash");
let chalk = require("chalk");
let Benchmark = require("benchmark");
let ServiceBroker = require("../src/service-broker");
let MemoryCacher = require("../src/cachers/memory");
let RedisCacher = require("../src/cachers/redis");

let key = "TESTKEY-12345";
//let data = fs.readFileSync(__dirname + "/data.json", "utf8");
let data = {
	a: 5,
	b: false,
	c: "Test string"
};

let broker = new ServiceBroker();

let memCacher = new MemoryCacher({
	prefix: "bench"
});
memCacher.init(broker);

let redisCacher = new RedisCacher({
	uri: "localhost:6379",
	prefix: "bench"
});
redisCacher.init(broker);

// ----
function benchMemoryCacher() {
	return memCacher.set(key, data).then(() => memCacher.get(key));	
}

function benchRedisCacher() {
	return redisCacher.set(key, data).then(() => redisCacher.get(key));	
}

let suite = new Benchmark.Suite;

suite
	.add("Memory cacher", {
		defer: true,
		fn(deferred) {
			return benchMemoryCacher().then(() => deferred.resolve());
		}
	})
	.add("Redis cacher", {
		defer: true,
		fn(deferred) {
			return benchRedisCacher().then(() => deferred.resolve());
		}
	})
	.on("cycle", function (event) {
		let bench = event.target;
		if (bench.error)
			console.error(chalk.red.bold(String(bench), bench.error.message, "\n", bench.error.stack || ""));
		else
			console.log("››", String(bench));
	})
	.on("complete", function () {
		console.log("---", "\nFastest:", this.filter("fastest").map("name").join(", "), "\nSlowest:", this.filter("slowest").map("name").join(", "));
		memCacher.close();
		redisCacher.close();
	});

console.log(chalk.yellow.bold("Benchmark Cachers"));
suite.run({
	defer: true,
	async: true
});