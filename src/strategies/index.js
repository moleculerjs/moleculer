/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

module.exports = {
	Base: require("./base"),
	RoundRobin: require("./round-robin"),
	Random: require("./random"),
	CpuUsage: require("./cpu-usage"),
	Latency: require('./latency')
};
