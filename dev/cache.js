/* eslint-disable no-console */

"use strict";

let chalk = require("chalk");

let utils = require("../../src/utils");
let ServiceBroker = require("../../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	namespace: "demo",
	transporter: null,
	logger: console,
	logLevel: "debug",
	metrics: true,
	cacher: true,
});

broker.loadService("./examples/post.service.js");
broker.loadService("./examples/user.service.js");


console.log(chalk.bold(">> Get all users"));

broker.start()
	.then(() => {
		return broker.call("v2.users.find");
	})

	.then(data => {
		console.log("v2.users.find response length:", data.length, "\n");
	})

	.then(() => {
		console.log(chalk.bold(">> Get user.5 (not found in the cache)"));
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
		return broker.cacher.clean("v2.users.*");
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
