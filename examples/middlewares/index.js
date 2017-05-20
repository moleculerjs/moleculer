"use strict";

let path = require("path");
let chalk = require("chalk");

let utils = require("../../src/utils");
let ServiceBroker = require("../../src/service-broker");
let MemoryCacher = require("../../src/cachers").Memory;

// Create broker
let broker = new ServiceBroker({
	logger: console,
	logLevel: "info",
	cacher: new MemoryCacher()
});

function middleware1() {
	return function(handler) {

		return function mw1(ctx) {
			broker.logger.info(chalk.yellow("mw1 before", ctx.action.name));
			return handler(ctx).then(res => {
				broker.logger.info(chalk.yellow("mw1 after", ctx.action.name));
				return res;
			});
		};

	};
}

function middleware2() {
	return function(handler) {

		return function mw2(ctx) {
			broker.logger.info(chalk.magenta("mw2 before-promise", ctx.action.name));
			return new broker.Promise(resolve => {
				setTimeout(() => {
					broker.logger.info(chalk.magenta("mw2 before", ctx.action.name));
					//resolve("data from mw2");
					resolve();
				}, 300);
			}).then(() => {
				return handler(ctx);
			}).then(res => {
				broker.logger.info(chalk.magenta("mw2 after", ctx.action.name));
				return res;
			});
		};
	};
}

function middleware3() {
	return function mw3(handler) {

		return function mw3(ctx) {
			broker.logger.info(chalk.cyan("mw3 before", ctx.action.name));
			//return broker.Promise.resolve("data from mw3");
			return handler(ctx).then(res => {
				broker.logger.info(chalk.cyan("mw3 after", ctx.action.name));
				if (res) {
					if (ctx.action.name == "users.get")
						delete res.gravatar;
					if (ctx.action.name == "posts.get")
						delete res.content;
				}
				return res;
			});
		};
	};
}


broker.use(middleware1());
broker.use(middleware2());
broker.use(middleware3());

/* Execution order

broker.call
	-> middleware3
		-> middleware2
			-> middleware1
				<-> action.handler
			<- middleware1
		<- middleware2
	<- middleware3
*/

broker.loadService(path.join(__dirname, "..", "post.service.js"));
broker.loadService(path.join(__dirname, "..", "user.service.js"));
broker.start();


broker.call("posts.get", { id: 3 }).then(console.log)
.then(() => {
	console.log(chalk.bold("\nNEXT CALL FROM CACHE"));
	return broker.call("posts.get", { id: 3 }).then(console.log);
})
.then(() => {
	console.log(chalk.bold("\nCLEAR CACHE"));
	return broker.emit("cache.clean", "posts.*");
})
.then(utils.delay(200))
.then(() => {
	console.log(chalk.bold("\nNEXT CALL WITHOUT CACHE"));
	return broker.call("posts.get", { id: 3 }).then(console.log);
});
