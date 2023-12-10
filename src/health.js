/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const os = require("os");
const { getIpList } = require("./utils");
const MOLECULER_VERSION = require("../package.json").version;

/**
 * Import types
 *
 * @typedef {import("./service-broker").NodeHealthStatus} NodeHealthStatus
 */

const getClientInfo = () => {
	return {
		type: "nodejs",
		version: MOLECULER_VERSION,
		langVersion: process.version
	};
};

const getCpuInfo = () => {
	const cpus = os.cpus();
	const load = os.loadavg();
	const cores = Array.isArray(cpus) ? os.cpus().length : null;
	const cpu = {
		load1: load[0],
		load5: load[1],
		load15: load[2],
		cores: cores,
		utilization: Math.min(Math.floor((load[0] * 100) / cores), 100)
	};

	return cpu;
};

const getMemoryInfo = () => {
	const mem = {
		free: os.freemem(),
		total: os.totalmem(),
		percent: null
	};
	mem.percent = (mem.free * 100) / mem.total;

	return mem;
};

/**
 *
 * @returns {os.UserInfo| {}}
 */
const getUserInfo = () => {
	try {
		return os.userInfo();
	} catch (e) {
		return {};
	}
};

const getOsInfo = () => {
	return {
		uptime: os.uptime(),
		type: os.type(),
		release: os.release(),
		hostname: os.hostname(),
		arch: os.arch(),
		platform: os.platform(),
		user: getUserInfo()
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
		ip: getIpList()
	};
};

const getDateTimeInfo = () => {
	return {
		now: Date.now(),
		iso: new Date().toISOString(),
		utc: new Date().toUTCString()
	};
};

/**
 *
 * @returns {NodeHealthStatus}
 */
const getHealthStatus = () => {
	return {
		cpu: getCpuInfo(),
		mem: getMemoryInfo(),
		os: getOsInfo(),
		process: getProcessInfo(),
		client: getClientInfo(),
		net: getNetworkInterfacesInfo(),
		time: getDateTimeInfo()
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
	getDateTimeInfo
};
