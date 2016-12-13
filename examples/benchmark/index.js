"use strict";

let _ = require("lodash");
let path = require("path");
let glob = require("glob");
let chalk = require("chalk");
let Benchmark = require("benchmark");

//let heapdump = require("heapdump");

let bus = require("../../src/service-bus");
let ServiceBroker = require("../../src/service-broker");

/*
// Add debug messages to bus
bus.onAny((event, value) => {
	console.log(chalk.yellow("[Event]", event));
});
*/


const ITERATIONS = 300 * 1000;

// Create broker
let broker = new ServiceBroker();

let userService = require("./user.service")(broker);

console.log("---------------------------------------\n"); 


console.log(chalk.white.bold("Benchmark #1: Call actions via service methods\n"));

userService.counter = 0;
let c = ITERATIONS;
let startTime = Date.now();

function doWork1(c) {
	return userService.actions.find()
	.then(() => { return userService.actions.get({ id: 4});	})
	.then(() => { return userService.actions.get({ id: 2}); })
	.then(() => { return userService.actions.find(); })
	/*.then(() => { 
		if (c) 
			doWork1(--c);
		else {
			//console.log("Count: ", userService.counter);
			//console.log(chalk.green.bold(`Done. Time: ${Date.now() - startTime}ms\n\n`));

		} 
	})*/
	.catch((err) => { console.warn(err); });
}

//doWork1(ITERATIONS);


/*heapdump.writeSnapshot(function(err, filename) {  
  console.log('dump written to', filename);
});*/



console.log(chalk.white.bold("Benchmark #1: Call actions via local broker\n"));

userService.counter = 0;
c = ITERATIONS;
startTime = Date.now();
function doWork2(c) {
	return broker.call("users.find")
	.then(() => { return broker.call("users.get", { id: 4});	})
	.then(() => { return broker.call("users.get", { id: 2}); })
	.then(() => { return broker.call("users.find"); })
	/*.then(() => { 
		if (c) 
			doWork2(--c);
		else {
			console.log("Count: ", userService.counter);
			console.log(chalk.green.bold(`Done. Time: ${Date.now() - startTime}ms\n\n`));

		} 
	})*/
	.catch((err) => { console.warn(err); });
}

//doWork2(ITERATIONS);

let suite = new Benchmark.Suite;

suite.add("Call actions via service methods", { 
	defer: true,
	fn(deferred) {
		return doWork1().then(() => deferred.resolve());
	}
})
.add("Call actions via local broker", {
	defer: true,
	fn(deferred) {
		return doWork2().then(() => deferred.resolve());
	}
})
.on("cycle", function(event) {
	console.log(String(event.target));
})
.on("complete", function() {
	console.log('Fastest is ' + this.filter('fastest').map('name'));
	console.log(this.toString());
})
.run({ defer: true, async: true });
