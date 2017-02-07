"use strict";

let _ = require("lodash");
let path = require("path");
let Promise = require("bluebird");

let utils = require("../../src/utils");
let ServiceBroker = require("../../src/service-broker");

let MemoryCacher = require("../../src/cachers").Memory;

/*
process.on("promiseCreated", promise => console.log("New promise created!", promise));
process.on("promiseChained", promise => console.log("New promise created!"));
Promise.config({
	monitoring: true
});*/

// Create broker
let broker = new ServiceBroker({
	nodeID: "server1",
	logger: console,
	logLevel: {
		"*": "warn",
		"CACHER": "debug",
		//"CTX": "debug",
		"METRICS-SVC": "debug"
	},
	metrics: true,
	cacher: new MemoryCacher()
});

// Load services
console.log(""); 
broker.loadServices(path.join(__dirname, ".."));
//require("../post.service")(broker);
//require("../user.service")(broker);
console.log("---------------------------------------\n"); 

console.log(">> Get all users");

// Call actions
broker.call("users.find").then(data => {
	console.log("users.find response length:", data.length, "\n");
})

.then(() => {
	console.log(">> Get user.5 (found in the cache)");
	return broker.call("users.get", { id: 5});
})
.then(data => {
	console.log("users.get(5) response user email:", data.email, "\n");
})

.then(() => {
	console.log(">> Get all posts");
	return broker.call("posts.find");
})
.then(data => {
	console.log("posts.find response length:", data.length, "\n");

	console.log(">> Get posts.4");	

	return broker.call("posts.get", { id: data[4].id }).then((post) => {
		console.log("posts[4].author email:", post.author.email, "\n");
	});
})

.then(() => {
	// Get from cache
	console.log(">> Get user.5 again (found in the cache)");
	return broker.call("users.get", { id: 5});
})
.then(data => {
	console.log("users.get(5) (cache) user email:", data.email, "\n");
})

.then(() => {
	console.log("CLEAN CACHE: users.*\n");
	// Clear the cache
	return broker.emit("cache.clean", { match: "users.*" });
})
.then(utils.delay(100))
.then(() => {
	console.log(">> Get user.5 again (not found in the cache, after clean)");
	// Not found in the cache
	return broker.call("users.get", { id: 5});
})
.then(data => {
	console.log("users.get(5) response user email:", data.email, "\n");
})

.catch((err) => {
	console.error("Error!", err);
});