"use strict";

let Benchmarker = require("../benchmarker");
Benchmarker.printHeader("UUID benchmark");

let TokenGenerator = require("uuid-token-generator");
let tokgen128 = new TokenGenerator(128, TokenGenerator.BASE62);
const uuidV4 = require("uuid/v4");
const utils = require("../../src/utils");

let bench = new Benchmarker({ async: false, name: "UUID generators"});

// ----
bench.add("uuid-token-generator", () => {
	return tokgen128.generate();
});

bench.add("uuid", () => {
	return uuidV4();
});

bench.add("e7", () => {
	return utils.generateToken();
});

bench.run();