/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const os = require("os");
const _ = require("lodash");
const { getIpList } = require("./utils");
const MOLECULER_VERSION = require("../package.json").version;

const getClientInfo = () => {
	return {
		type: "nodejs",
		version: MOLECULER_VERSION,
		langVersion: process.version
	};
};

const getCpuInfo = () => {
	const load = os.loadavg();
	const cpu = {
		load1: load[0],
		load5: load[1],
		load15: load[2],
		cores: os.cpus().length,
	};
	cpu.utilization = Math.min(Math.floor(load[0] * 100 / cpu.cores), 100);

	return cpu;
};

const getMemoryInfo = () => {
	const mem = {
		free: os.freemem(),
		total: os.totalmem()
	};
	mem.percent = (mem.free * 100 / mem.total);

	return mem;
};

const getOsInfo = () => {
	return {
		uptime: os.uptime(),
		type: os.type(),
		release: os.release(),
		hostname: os.hostname(),
		arch: os.arch(),
		platform: os.platform(),
		user: os.userInfo()
	};
};

const getProcessInfo = () => {
	return {
		pid: process.pid,
		memory: process.memoryUsage(),
		uptime: process.uptime(),
		argv: process.argv
	};
};

const getNetworkInterfacesInfo = () => {
	return {
		ip:  getIpList()
	};
};

const getTransitStatus = (broker) => {
	if (broker.transit) {
		return {
			stat: _.clone(broker.transit.stat)
		};
	}

	/* istanbul ignore next */
	return null;
};

const getDateTimeInfo = () => {
	return {
		now: Date.now(),
		iso: new Date().toISOString(),
		utc: new Date().toUTCString()
	};
};

const getHealthStatus = (broker) => {
	return {
		cpu: getCpuInfo(),
		mem: getMemoryInfo(),
		os: getOsInfo(),
		process: getProcessInfo(),
		client: getClientInfo(),
		net: getNetworkInterfacesInfo(),
		transit: getTransitStatus(broker),
		time: getDateTimeInfo()

		// TODO: event loop & GC info
		// https://github.com/RisingStack/trace-nodejs/blob/master/lib/agent/metrics/apm/index.js
	};
};

module.exports = {
	getHealthStatus,
	getCpuInfo,
	getMemoryInfo,
	getOsInfo,
	getProcessInfo,
	getClientInfo,
	getNetworkInterfacesInfo,
	getTransitStatus,
	getDateTimeInfo
};
