"use strict";

let Benchmarker = require("../benchmarker");
Benchmarker.printHeader("JSON parser benchmark");

let parse = require("fast-json-parse");

let bench = new Benchmarker({ async: false, name: "Parse JSON (50k) to JS object"});
let data = bench.getDataFile("50k.json");

// ----
bench.add("Built-in JSON.parse", () => {
	try {
		return JSON.parse(data);
	} catch (e) {
	}
});

bench.add("fast-json-parse", () => {
	return parse(data);
});

bench.run();