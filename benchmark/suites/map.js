"use strict";

let _ = require("lodash");
let Promise	= require("bluebird");

let Benchmarker = require("../benchmarker");
Benchmarker.printHeader("Map vs. Object benchmark");

let bench1 = new Benchmarker({ async: false, name: "Set Map vs. Add props to object"});

let payload = {
	a: 1, 
	b: "String"
};
const cycle = 10 * 1000;

bench1.add("Map.set", () => {
	let map = new Map();
	let c = 0;
	while (++c < cycle) {
		map.set("test-" + c, payload);
	}
});

bench1.add("Object[]", () => {
	let obj = {};
	let c = 0;
	while (++c < cycle) {
		obj["test-" + c] = payload;
	}
});

let bench2 = new Benchmarker({ async: false, name: "Get Map vs. Get props from object"});

// Load work vars
let obj = {};
let map = new Map();
let c = 0;
while (++c < cycle) {
	obj["test-" + c] = payload;
	map.set("test-" + c, payload);
}

bench2.add("Map.get", () => {
	let c = 0;
	let res;
	while (++c < cycle)
		res = map.get("test-" + c);
	
	return res;
});

bench2.add("Object[]", () => {
	let res;
	let c = 0;
	while (++c < cycle)
		res = obj["test-" + c];
	
	return res;
});

bench1.run().then(() => {
	return bench2.run();
});