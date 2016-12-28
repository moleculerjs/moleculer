"use strict";

let fs = require("fs");
let _ = require("lodash");
let chalk = require("chalk");
let Benchmark = require("benchmark");

let parse = require("fast-json-parse");

let data = fs.readFileSync(__dirname + "/data.json", "utf8");

function benchBuiltInParse() {
	try {
		return JSON.parse(data);
	} catch (e) {
	}
}

function benchFastJsonParse() {
	return parse(data);
}

let suite = new Benchmark.Suite;

suite
	.add("Built-in JSON.parse", benchBuiltInParse)
	.add("fast-json-parse", benchFastJsonParse)
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

console.log(chalk.yellow.bold("Benchmark Stringify"));
suite.run();