"use strict";

let _ = require("lodash");
let chalk = require("chalk");
let Benchmark = require("benchmark");

function benchMemoryCacher() {

}

function benchRedisCacher() {

}

let suite = new Benchmark.Suite;

suite
	.add("Memory cacher", benchMemoryCacher)
	.add("Redis cacher", benchRedisCacher)
	.on("cycle", function (event) {
		let bench = event.target;
		if (bench.error)
			console.error(chalk.red.bold(String(bench), bench.error.message, "\n", bench.error.stack || ""));
		else
			console.log("››", String(bench));
	})
	.on("complete", function () {
		console.log("---", "\nFastest:", this.filter("fastest").map("name").join(", "), "\nSlowest:", this.filter("slowest").map("name").join(", "));
	});

console.log(chalk.yellow.bold("Benchmark #2"));
suite.run();