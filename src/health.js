/*
 * moleculer
 * Copyright (c) 2017 Icebob (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const os = require("os");

module.exports = function() {
	return Promise.resolve({})

		// CPU
		.then(res => {
			const load = os.loadavg();
			res.cpu = {
				load1: load[0],
				load5: load[1],
				load15: load[2],
				cores: os.cpus().length,
			};
			res.cpu.utilization = Math.floor(load[0] * 100 / res.cpu.cores);

			return res;
		})

		// Memory
		.then(res => {
			res.mem = {
				free: os.freemem(),
				total: os.totalmem(),
			};
			res.mem.percent = (res.mem.free * 100 / res.mem.total);

			return res;
		})

		// OS 
		.then(res => {
			res.os = {
				uptime: os.uptime(),
				type: os.type(),
				release: os.release(),
				hostname: os.hostname(),
				arch: os.arch(),
				platform: os.platform(),
				user: os.userInfo()
			};

			return res;
		})

		// Process 
		.then(res => {
			res.process = {
				pid: process.pid,
				memory: process.memoryUsage(),
				uptime: process.uptime()
			};

			return res;
		})

		// Network interfaces
		.then(res => {
			res.net = {
				ip: []
			};
			res.mem.percent = (res.mem.free * 100 / res.mem.total);

			const interfaces = os.networkInterfaces();
			for (let iface in interfaces) {
				for (let i in interfaces[iface]) {
					const f = interfaces[iface][i];
					if (f.family === "IPv4" && !f.internal) {
						res.net.ip.push(f.address);
						break;
					}
				}
			}					

			return res;
		})

		// Date & time
		.then(res => {
			res.time = {
				now: Date.now(),
				iso: new Date().toISOString(),
				utc: new Date().toUTCString()
			};
			return res;
		});

		// TODO: event loop & GC info
		// https://github.com/RisingStack/trace-nodejs/blob/master/lib/agent/metrics/apm/index.js

};