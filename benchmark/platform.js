"use strict";

let os = require("os");

module.exports = logger => {
	logger.info("Platform info:");
	logger.info("==============");

	logger.info("  ", os.type() + " " + os.release() + " " + os.arch());
	logger.info("  ", "Node.JS:", process.versions.node);
	logger.info("  ", "V8:", process.versions.v8);

	let cpus = os.cpus().map(function (cpu) {
		return cpu.model;
	}).reduce(function (o, model) {
		if (!o[model]) o[model] = 0;
		o[model]++;
		return o;
	}, {});

	cpus = Object.keys(cpus).map(function (key) {
		return key + " \u00d7 " + cpus[key];
	}).join("\n");

	logger.info("  ", cpus);
};