"use strict";

let _ = require("lodash");
let path = require("path");
let glob = require("glob");

let ServiceBroker = require("../../src/service-broker");
//let MemoryCacher = require("../../src/cachers").Memory;

// Create broker
let broker = new ServiceBroker({
	nodeID: "server",
	logger: console,
	logLevel: "debug"
});

function middleware1() {
	return function mw1(ctx, next) {
		ctx.logger.info("mw1 before", ctx.action.name);
		return next.then(res => {
			ctx.logger.info("mw1 after", ctx.action.name);
			return res;
		});
	};
}

function middleware2() {
	return function mw2(ctx, next) {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				ctx.logger.info("mw2 before");
				resolve(next);
			}, 300);
		});
	};
}

function middleware3() {
	return function mw3(ctx, next) {
		ctx.logger.info("mw3 before");
		return next.then(res => {
			ctx.logger.info("mw3 after", ctx.action.name);
			delete res.content;
			return res;
		});
	};
}

broker.use(middleware1());
broker.use(middleware2());
broker.use(middleware3());

//broker.loadServices(path.join(__dirname, ".."));
broker.loadService(path.join(__dirname, "..", "post.service.js"));
broker.loadService(path.join(__dirname, "..", "user.service.js"));
broker.start();

broker.call("posts.get", { id: 3 }).then(console.log);
/*let ctx = { action: { name: "test" }, duration: 0};
let mainAction = () => {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			console.log("CALL");
			resolve();		
		}, 300);
	});
};
broker.callMiddlewares(ctx, mainAction).then("Invoke");
*/