"use strict";

let _ = require("lodash");
let chalk = require("chalk");
let Benchmark = require("benchmark");

//let heapdump = require("heapdump");

let ServiceBroker = require("../../src/service-broker");


// Create broker
let broker = new ServiceBroker();

let userService = require("./user.service")(broker);

console.log("---------------------------------------\n");

function bench1ViaService() {
	return userService.actions.find()
		/*.then(() => {
			return userService.actions.get({
				id: 4
			});
		})
		.then(() => {
			return userService.actions.get({
				id: 2
			});
		})
		.then(() => {
			return userService.actions.find();
		})*/
		.catch((err) => {
			console.warn(err);
		});
}

/*heapdump.writeSnapshot(function(err, filename) {  
  console.log('dump written to', filename);
});*/


function bench1ViaBroker() {
	return broker.call("users.find")
		/*.then(() => {
			return broker.call("users.get", {
				id: 4
			});
		})
		.then(() => {
			return broker.call("users.get", {
				id: 2
			});
		})
		.then(() => {
			return broker.call("users.find");
		})*/
		.catch((err) => {
			console.warn(err);
		});
}

let suite = new Benchmark.Suite;

suite
	.add("Call via service methods", {
		defer: true,
		fn(deferred) {
			return bench1ViaService().then(() => deferred.resolve());
		}
	})
	.add("Call via local broker", {
		defer: true,
		fn(deferred) {
			return bench1ViaBroker().then(() => deferred.resolve());
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
	});

console.log(chalk.yellow.bold("Benchmark #1"));
suite.run({
	defer: true,
	async: true
});