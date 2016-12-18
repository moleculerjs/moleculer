"use strict";

let _ = require("lodash");
let chalk = require("chalk");
let Benchmark = require("benchmark");

function benchRedisTransport() {

}

function benchNatsTransport() {

}

function benchWebsocketTransport() {

}

let suite = new Benchmark.Suite;

suite
	.add("Redis transporter", benchRedisTransport)
	.add("NATS transporter", benchNatsTransport)
	.add("Websocket transporter", benchWebsocketTransport)
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