/* eslint-disable no-console */

"use strict";

//let _ = require("lodash");
let path = require("path");
let chalk = require("chalk");

let utils = require("../../src/utils");
let ServiceBroker = require("../../src/service-broker");

let MemoryCacher = require("../../src/cachers").Memory;
let RedisCacher = require("../../src/cachers").Redis;

/*
process.on("promiseCreated", promise => console.log("New promise created!", promise));
process.on("promiseChained", promise => console.log("New promise created!"));
Promise.config({
	monitoring: true
});*/

// Create broker
let broker = new ServiceBroker({
	logger: console,
	logLevel: {
		"*": "warn",
		"CACHER": "debug",
		//"CTX": "debug",
		"METRICS-SVC": "debug"
	},
	metrics: true,
	//cacher: new MemoryCacher()
	cacher: new RedisCacher("redis://localhost:6379")
});

// Load services
console.log("");
broker.loadServices(path.join(__dirname, ".."));
console.log("");

console.log(chalk.bold(">> Get all users"));

broker.start()
	.then(() => {
		return broker.call("v2.users.find");
	})

	.then(data => {
		console.log("v2.users.find response length:", data.length, "\n");
	})

	.then(() => {
		console.log(chalk.bold(">> Get user.5 (found in the cache)"));
		return broker.call("v2.users.get", {
			id: 5
		});
	})
	.then(data => {
		console.log("v2.users.get(5) response user email:", data.email, "\n");
	})

	.then(() => {
		console.log(chalk.bold(">> Get all posts (populate authors from users"));
		return broker.call("posts.find", {
			limit: 10
		});
	})
	.then(data => {
		console.log("posts.find response length:", data.length, "\n");

		console.log(chalk.bold(">> Get posts.4 (populate author from cache)"));

		return broker.call("posts.get", {
			id: data[4].id
		}).then((post) => {
			console.log("posts[4].author email:", post.author.email, "\n");
		});
	})

	.then(() => {
		// Get from cache
		console.log(chalk.bold(">> Get user.5 again (found in the cache)"));
		return broker.call("v2.users.get", {
			id: 5
		});
	})
	.then(data => {
		console.log("v2.users.get(5) (cache) user email:", data.email, "\n");
	})

	.then(() => {
		console.log(chalk.yellow.bold("CLEAN CACHE: v2.users.*\n"));
		// Clear the cache
		return broker.emit("cache.clean", "v2.users.*");
	})
	.then(utils.delay(100))
	.then(() => {
		console.log(chalk.bold("\n>> Get user.5 again (not found in the cache, after clean)"));
		// Not found in the cache
		return broker.call("v2.users.get", {
			id: 5
		});
	})
	.then(data => {
		console.log("v2.users.get(5) response user email:", data.email, "\n");
	})

	.catch((err) => {
		console.error("Error!", err);
	})

	.then(() => broker.stop());
