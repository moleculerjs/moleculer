"use strict";

let _ = require("lodash");
let path = require("path");
let glob = require("glob");
let chalk = require("chalk");

let heapdump = require("heapdump");

let bus = require("../../src/service-bus");
let ServiceBroker = require("../../src/service-broker");

/*
// Add debug messages to bus
bus.onAny((event, value) => {
	console.log(chalk.yellow("[Event]", event));
});
*/

const ITERATIONS = 100 * 1000;

// Create broker
let broker = new ServiceBroker();

let userService = require("./user.service")(broker);

console.log("---------------------------------------\n"); 


console.log(chalk.white.bold("Benchmark #1: Call actions via service methods\n"));

let c = ITERATIONS;
let startTime = Date.now();
while (c--) {
	userService.actions.find().then(() => { });
	userService.actions.get({ id: 4}).then(() => { });
	userService.actions.get({ id: 2}).then(() => { });
	userService.actions.find().then(() => { });
}

console.log(chalk.green.bold(`Done. Time: ${Date.now() - startTime}ms\n\n`));

heapdump.writeSnapshot(function(err, filename) {  
  console.log('dump written to', filename);
});


/*
console.log(chalk.white.bold("Benchmark #1: Call actions via local broker\n"));

c = ITERATIONS;
startTime = Date.now();
while (c--) {
	broker.call("users.find").then(() => { });
	broker.call("users.get", { id: 4}).then(() => { });
	broker.call("users.get", { id: 2}).then(() => { });
	broker.call("users.find").then(() => { });
}

console.log(chalk.green.bold(`Done. Time: ${Date.now() - startTime}ms\n\n`));
*/