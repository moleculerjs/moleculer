"use strict";

let _ = require("lodash");

let Benchmarker = require("../benchmarker");
Benchmarker.printHeader("Map vs. Object benchmark");

let bench = new Benchmarker({ async: false, name: "Set Map vs. Add props to object"});

let map = new Map();
let obj = {};

let objCounter = 1;
let mapCounter = 1;
let data = {
	a: 1, 
	b: "String"
};

bench.add("Map.set", () => {
	map.set("test-" + mapCounter++, data);
});

bench.add("Object[]", () => {
	obj["test-" + objCounter++] = data;
});

bench.run();