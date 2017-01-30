"use strict";

let _ = require("lodash");
let PromiseBB	= require("bluebird");

let Benchmarker = require("../benchmarker");
Benchmarker.printHeader("Promise vs BlueBird vs Native");

let bench = new Benchmarker({ async: true, name: "Promise vs BlueBird vs Native"});

function add(a, b) {
	return a + b;
}

bench.add("No promise", () => {
	return add(5, 8);
}, false);

bench.add("ES6 Promise.resolve", () => {
	return Promise.resolve().then(() => {
		return add(5, 8);
	});
});

bench.add("ES6 new Promise", () => {
	return new Promise(resolve => {
		resolve(add(5, 8));
	});
});

bench.add("Bluebird Promise.resolve", () => {
	return PromiseBB.resolve().then(() => {
		return add(5, 8);
	});
});

bench.add("Bluebird Promise.resolve + 5 x then", () => {
	return PromiseBB.resolve()
		.then(() => add(5, 8))
		.then(() => add(3, 2))
		.then(() => add(9, 3))
		.then(() => add(1, 4))
		.then(() => add(6, 7));
});

bench.add("Bluebird new Promise", () => {
	return new PromiseBB(resolve => {
		resolve(add(5, 8));
	});
});

bench.run();