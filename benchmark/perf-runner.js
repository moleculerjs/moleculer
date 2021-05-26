/* eslint-disable no-console */

"use strict";

const fs = require("fs");
//const Promise = require("bluebird");

const ServiceBroker = require("../src/service-broker");
const Transporters = require("../src/transporters");
const Middlewares = require("../src/middlewares");

const { AsyncLocalStorage } = require("async_hooks");

const asyncLocalStorage = new AsyncLocalStorage();

const AsyncLocalStorageMiddleware = {
	localAction(handler) {
		return (ctx) => asyncLocalStorage.run(ctx, () => handler(ctx));
	},
};
/*
const async_hooks = require("async_hooks");
const hook = async_hooks.createHook({
	init(asyncId, type, triggerAsyncId, resource) { },
	before(asyncId) { },
	after(asyncId) { },
	destroy(asyncId) { },
	promiseResolve(asyncId) { },
});
hook.enable();
*/

const someData = JSON.parse(fs.readFileSync("./benchmark/data/10k.json", "utf8"));

function createBrokers(Transporter, opts) {
	const b1 = new ServiceBroker({
		nodeID: "node-1",
		logger: true,
		transporter: new Transporter(opts),
		//internalMiddlewares: false,
		middlewares: [
			//AsyncLocalStorageMiddleware
			//Middlewares.Transmit.Encryption("moleculer"),
			//Middlewares.Transmit.Compression(),
		],
		//Promise
	});

	const b2 = new ServiceBroker({
		nodeID: "node-2",
		logger: true,
		transporter: new Transporter(opts),
		//internalMiddlewares: false,
		middlewares: [
			//AsyncLocalStorageMiddleware
			//Middlewares.Transmit.Encryption("moleculer"),
			//Middlewares.Transmit.Compression(),
		],
		//Promise
	});

	b2.createService({
		name: "echo",
		actions: {
			reply(ctx) {
				return ctx.params;
			},
			big(ctx) {
				return someData;
			}
		}
	});

	return b1.Promise.all([
		b1.start(),
		b2.start(),
	]).then(() => [b1, b2]);
}

createBrokers(Transporters.Fake).then(([b1, b2]) => {

	let count = 0;
	function doRequest() {
		count++;
		return b1.call("echo.reply", { a: count }).then(res => {
			if (count % 10000) {
				// Fast cycle
				doRequest();
			} else {
				// Slow cycle
				setImmediate(() => doRequest());
			}
			return res;

		}).catch(err => {
			throw err;
		});
	}

	setTimeout(() => {
		let startTime = Date.now();

		setInterval(() => {
			let rps = count / ((Date.now() - startTime) / 1000);
			console.log("RPS:", rps.toLocaleString("hu-HU", { maximumFractionDigits: 0 }), "req/s");
			count = 0;
			startTime = Date.now();
		}, 1000);

		b1.waitForServices(["echo"]).then(() => doRequest());

	}, 1000);

});


/*
Local calls
============

No async:  			1 523 904 req/s
AsyncLocalStorage: 	  185 005 req/s
Async hooks:		  108 803 req/s


Remote calls
=============

No async: 			   57 197 req/s
AsyncLocalStorage:	   28 791 req/s
Async hooks:		   20 790 req/s


*/
