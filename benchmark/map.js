"use strict";

let _ = require("lodash");
let chalk = require("chalk");
let Benchmark = require("benchmark");

let map = new Map();
let obj = {};

let objCounter = 1;
let mapCounter = 1;
let data = {
	a: 1, 
	b: "String"
};

function benchMapSet() {
	map.set("test-" + mapCounter++, data);
}


function benchObjSet() {
	obj["test-" + objCounter++] = data;
}

let suite = new Benchmark.Suite;

suite
	.add("Map.set", benchMapSet)
	.add("Object[]", benchObjSet)
	.on("cycle", function (event) {
		let bench = event.target;
		if (bench.error)
			console.error(chalk.red.bold(String(bench), bench.error.message, "\n", bench.error.stack || ""));
		else
			console.log("››", String(bench));

		console.log("mapCounter", mapCounter);
	})
	.on("complete", function () {
		console.log("---", "\nFastest:", this.filter("fastest").map("name").join(", "), "\nSlowest:", this.filter("slowest").map("name").join(", "));
	});

console.log(chalk.yellow.bold("Benchmark Map vs Object"));
suite.run();