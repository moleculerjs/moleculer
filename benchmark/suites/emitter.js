"use strict";

const Benchmarkify = require("benchmarkify");
const benchmark = new Benchmarkify("Event bus benchmark").printHeader();

let bench1 = benchmark.createSuite("Event bus test");

const EventEmitter = require("events").EventEmitter;
const emitter = new EventEmitter;
emitter.on("test1", function () {
	1 == 1;
});

const EventEmitter2 = require("eventemitter2").EventEmitter2;
const emitter2 = new EventEmitter2;
emitter2.on("test2", function () {
	1 == 1;
});

const AndrasEmitter = require("../../docs/eventbus");
const emitter3 = new AndrasEmitter();
emitter3.on("test3", function () {
	1 == 1;
});

bench1.add("András", () => {
	return emitter3.emit("test3");
});

bench1.ref("EventEmitter", () => {
	return emitter.emit("test1");
});

bench1.add("EventEmitter2", () => {
	return emitter2.emit("test2");
});


bench1.run();

/*


*/
