"use strict";

let _ = require("lodash");

let Benchmarker = require("../benchmarker");
Benchmarker.printHeader("Map vs. Object benchmark");

let bench = new Benchmarker({ async: false, name: "Set Map vs. Add props to object"});

let data = {
	a: 1, 
	b: "String"
};
const cycle = 10 * 1000;

bench.add("Map.set", () => {
	let map = new Map();
	let c = 0;
	while (++c < cycle) {
		map.set("test-" + c, data);
	}
});

bench.add("Object[]", () => {
	let obj = {};
	let c = 0;
	while (++c < cycle) {
		obj["test-" + c] = data;
	}
});

bench.run();