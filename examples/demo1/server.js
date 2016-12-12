"use strict";

let _ = require("lodash");
let path = require("path");
let glob = require("glob");
let chalk = require("chalk");

let bus = require("../../src/service-bus");
let ServiceBroker = require("../../src/service-broker");


// Add debug messages to bus
bus.onAny((event, value) => {
	console.log(chalk.yellow("[Event]", event));
});

// Create broker
let broker = new ServiceBroker();

// Load services
console.log(""); 
console.log("Load services..."); 
let serviceFiles = glob.sync(path.join(__dirname, "*.service.js"));
if (serviceFiles) {
	serviceFiles.forEach(function(servicePath) {
		console.log("  Load service", path.basename(servicePath));
		require(path.resolve(servicePath))(broker);
	});
}
console.log("---------------------------------------\n"); 

// Call actions
broker.call("users.find").then(data => {
	console.log("users.find response length:", data.length);
})
.catch((err) => {
	console.error("users.find error!", err);
})

.then(() => {
	return broker.call("users.get", { id: 5});
})
.then(data => {
	console.log("users.get(5) response user email:", data.email);
})
.catch((err) => {
	console.error("users.get error!", err);
})

.then(() => {
	return broker.call("posts.find");
})
.then(data => {
	console.log("posts.find response length:", data.length);

	return broker.call("posts.author", { id: data[4].id }).then((author) => {
		console.log("posts[4].author email:", author.email);
	});

}).catch((err) => {
	console.error("posts.find error!", err);
})

.then(() => {
// Get from cache
	return broker.call("users.get", { id: 5});
})
.then(data => {
	console.log("users.get(5) response user email:", data.email);
})
.catch((err) => {
	console.error("users.get error!", err);
});