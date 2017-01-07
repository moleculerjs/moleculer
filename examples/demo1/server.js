"use strict";

let _ = require("lodash");
let path = require("path");
let glob = require("glob");

let ServiceBroker = require("../../src/service-broker");
let MemoryCacher = require("../../src/cachers").Memory;

// Create broker
let broker = new ServiceBroker({
	cacher: new MemoryCacher(),
	nodeID: "server1",
	logger: console,
	logLevel: {
		"*": "warn",
		"CTX": "debug"
	},
	metrics: false
});

// Load services
console.log(""); 
broker.loadServices(path.join(__dirname, ".."));
//require("../post.service")(broker);
//require("../user.service")(broker);
console.log("---------------------------------------\n"); 

// Call actions
broker.call("users.find").then(data => {
	console.log("users.find response length:", data.length, "\n");
})

.then(() => {
	return broker.call("users.get", { id: 5});
})
.then(data => {
	console.log("users.get(5) response user email:", data.email, "\n");
})

.then(() => {
	return broker.call("posts.find");
})
.then(data => {
	console.log("posts.find response length:", data.length, "\n");

	return broker.call("posts.get", { id: data[4].id }).then((post) => {
		console.log("posts[4].author email:", post.author.email, "\n");
	});
})

.then(() => {
// Get from cache
	return broker.call("users.get", { id: 5});
})
.then(data => {
	console.log("users.get(5) response user email:", data.email, "\n");
})
.catch((err) => {
	console.error("Error!", err);
});