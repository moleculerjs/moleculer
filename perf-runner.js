"use strict";

const v8 = require('v8-natives');   

let ServiceBroker = require("./src/service-broker");
let Context = require("./src/context");
let Transporters = require("./src/transporters");

let { generateToken, json2String } = require("./src/utils");
let Promise	= require("bluebird");


function createBrokers(Transporter, opts) {
	let b1 = new ServiceBroker({
		transporter: new Transporter(opts),
		//requestTimeout: 0,
		//logger: console,
		//logLevel: "debug",
		nodeID: "node-1"
	});

	let b2 = new ServiceBroker({
		transporter: new Transporter(opts),
		//requestTimeout: 0,
		//logger: console,
		//logLevel: "debug",
		nodeID: "node-2"
	});

	b2.createService({
		name: "echo",
		actions: {
			reply(ctx) {
				return ctx.params;
			}
		}
	});

	b1.start().then(() => b2.start());

	return [b1, b2];
}

let [b1, b2] = createBrokers(Transporters.Fake);

function translateStatus(status) {
	const texts = [
		"-",
		"Optimized",
		"Un-optimized",
		"Always Optimized",
		"Never Optimized",
		"?",
		"Maybe Optimized",
	];
	return texts[status];
}


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

	}).catch(err => {
		throw err;
	});
}

/*
let msg = {
	nodeID: "server-2",
	requestID: generateToken(),
	action: "posts.empty",
	params: { a: 5 }
};

function doStringify() {
	count++;
	let res = json2String(msg);

	if (count % 10000) 
		doStringify();
	else
		setImmediate(() => doStringify());
}*/

setTimeout(() => {
	let startTime = Date.now();

	doRequest();
	//doStringify();

	setInterval(() => {
		let rps = count / ((Date.now() - startTime) / 1000);
		console.log("RPS:", rps.toLocaleString("hu-HU", {maximumFractionDigits: 0}), "req/s");
		count = 0;
		startTime = Date.now();

		console.log(translateStatus(v8.getOptimizationStatus(json2String)));		
	}, 1000);

}, 500);

