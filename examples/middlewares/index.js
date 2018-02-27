/* eslint-disable no-console */

"use strict";

let path = require("path");
let chalk = require("chalk");

let ServiceBroker = require("../../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	logger: console,
	logLevel: "info",
	transporter: null,
	cacher: true,
});

function middleware1() {
	return function (handler) {

		return function mw1(ctx) {
			broker.logger.info(chalk.yellow("mw1 before", ctx.action.name));
			return handler(ctx).then(res => {
				broker.logger.info(chalk.yellow("mw1 after", ctx.action.name));
				return res;
			});
		};

	};
}

// Promise example
function middleware2() {
	return function (handler) {

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

// Async/await example
function middleware3() {
	return function mw3(handler) {

		return async function mw3(ctx) {
			broker.logger.info(chalk.cyan("mw3 before", ctx.action.name));
			//return broker.Promise.resolve("data from mw3");
			const res = await handler(ctx);
			broker.logger.info(chalk.cyan("mw3 after", ctx.action.name));
			if (res) {
				if (ctx.action.name == "users.get")
					delete res.gravatar;
				if (ctx.action.name == "posts.get")
					delete res.content;
			}
			return res;
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
broker.start().then(() => {

	return broker.call("posts.get", { id: 3 }).then(res => broker.logger.info(res))
		.then(() => {
			console.log(chalk.bold("\n--- NEXT CALL FROM CACHE ---\n"));
			return broker.call("posts.get", { id: 3 }).then(res => broker.logger.info(res));
		});

});
