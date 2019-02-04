/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird");
const os = require("os");
const METRIC = require("./constants");
const cpuUsage = require("../cpu-usage");

let v8, gc, eventLoop;

// Load `v8` module for heap metrics.
try {
	v8 = require("v8");
} catch (e) {
	// silent
}

// Load `gc-stats` module for GC metrics.
try {
	gc = (require("gc-stats"))();
} catch (e) {
	// silent
}

// Load `event-loop-stats` metric for Event-loop metrics.
try {
	eventLoop = require("event-loop-stats");
} catch (e) {
	// silent
}

/**
 * Register common OS, process & Moleculer metrics.
 */
function registerCommonMetrics() {
	this.logger.debug("Registering common metrics...");

	// --- METRICS SELF METRICS ---

	this.register({ name: METRIC.MOLECULER_METRICS_COMMON_COLLECT_TOTAL, type: METRIC.TYPE_COUNTER, description: "Number of metric collections" });
	this.register({ name: METRIC.MOLECULER_METRICS_COMMON_COLLECT_TIME, type: METRIC.TYPE_GAUGE, description: "Time of collecting metrics" });

	// --- PROCESS METRICS ---

	const item = this.register({ name: METRIC.PROCESS_ARGUMENTS, type: METRIC.TYPE_INFO, labelNames: ["index"], description: "Process arguments" });
	process.argv.map((arg, index) => item.set(arg, { index }));

	this.register({ name: METRIC.PROCESS_PID, type: METRIC.TYPE_INFO, description: "Process PID" }).set(process.pid);
	this.register({ name: METRIC.PROCESS_PPID, type: METRIC.TYPE_INFO, description: "Process parent PID" }).set(process.ppid);

	this.register({ name: METRIC.PROCESS_EVENTLOOP_LAG_MIN, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_MILLISECONDS, description: "Minimum of event loop lag" });
	this.register({ name: METRIC.PROCESS_EVENTLOOP_LAG_AVG, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_MILLISECONDS, description: "Average of event loop lag" });
	this.register({ name: METRIC.PROCESS_EVENTLOOP_LAG_MAX, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_MILLISECONDS, description: "Maximum of event loop lag" });
	this.register({ name: METRIC.PROCESS_EVENTLOOP_LAG_COUNT, type: METRIC.TYPE_GAUGE, description: "Number of event loop lag samples." });

	this.register({ name: METRIC.PROCESS_MEMORY_HEAP_SIZE_TOTAL, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_BYTE, description: "Process heap size" });
	this.register({ name: METRIC.PROCESS_MEMORY_HEAP_SIZE_USED, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_BYTE, description: "Process used heap size" });
	this.register({ name: METRIC.PROCESS_MEMORY_RSS, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_BYTE, description: "Process RSS size" });
	this.register({ name: METRIC.PROCESS_MEMORY_EXTERNAL, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_BYTE, description: "Process external memory size" });

	this.register({ name: METRIC.PROCESS_MEMORY_HEAP_SPACE_SIZE_TOTAL, type: METRIC.TYPE_GAUGE, labelNames: ["space"], unit: METRIC.UNIT_BYTE, description: "Process total heap space size" });
	this.register({ name: METRIC.PROCESS_MEMORY_HEAP_SPACE_SIZE_USED, type: METRIC.TYPE_GAUGE, labelNames: ["space"], unit: METRIC.UNIT_BYTE, description: "Process used heap space size" });
	this.register({ name: METRIC.PROCESS_MEMORY_HEAP_SPACE_SIZE_AVAILABLE, type: METRIC.TYPE_GAUGE, labelNames: ["space"], unit: METRIC.UNIT_BYTE, description: "Process available heap space size" });
	this.register({ name: METRIC.PROCESS_MEMORY_HEAP_SPACE_SIZE_PHYSICAL, type: METRIC.TYPE_GAUGE, labelNames: ["space"], unit: METRIC.UNIT_BYTE, description: "Process physical heap space size" });

	this.register({ name: METRIC.PROCESS_MEMORY_HEAP_STAT_HEAP_SIZE_TOTAL, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_BYTE, description: "Process heap stat size" });
	this.register({ name: METRIC.PROCESS_MEMORY_HEAP_STAT_EXECUTABLE_SIZE_TOTAL, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_BYTE, description: "Process heap stat executable size" });
	this.register({ name: METRIC.PROCESS_MEMORY_HEAP_STAT_PHYSICAL_SIZE_TOTAL, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_BYTE, description: "Process heap stat physical size" });
	this.register({ name: METRIC.PROCESS_MEMORY_HEAP_STAT_AVAILABLE_SIZE_TOTAL, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_BYTE, description: "Process heap stat available size" });
	this.register({ name: METRIC.PROCESS_MEMORY_HEAP_STAT_USED_HEAP_SIZE, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_BYTE, description: "Process heap stat used size" });
	this.register({ name: METRIC.PROCESS_MEMORY_HEAP_STAT_HEAP_SIZE_LIMIT, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_BYTE, description: "Process heap stat size limit" });
	this.register({ name: METRIC.PROCESS_MEMORY_HEAP_STAT_MALLOCATED_MEMORY, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_BYTE, description: "Process heap stat mallocated size" });
	this.register({ name: METRIC.PROCESS_MEMORY_HEAP_STAT_PEAK_MALLOCATED_MEMORY, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_BYTE, description: "Peak of process heap stat mallocated size" });
	this.register({ name: METRIC.PROCESS_MEMORY_HEAP_STAT_ZAP_GARBAGE, type: METRIC.TYPE_GAUGE, description: "Process heap stat zap garbage" });

	this.register({ name: METRIC.PROCESS_UPTIME, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_SECONDS, description: "Process uptime" });
	this.register({ name: METRIC.PROCESS_INTERNAL_ACTIVE_HANDLES, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_HANDLE, description: "Number of active process handlers" });
	this.register({ name: METRIC.PROCESS_INTERNAL_ACTIVE_REQUESTS, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_REQUEST, description: "Number of active process requests" });

	this.register({ name: METRIC.PROCESS_VERSIONS_NODE, type: METRIC.TYPE_INFO, description: "Node version" }).set(process.versions.node);

	// --- GARBAGE COLLECTOR METRICS ---

	this.register({ name: METRIC.PROCESS_GC_TIME, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_NANOSECONDS, description: "GC time" });
	this.register({ name: METRIC.PROCESS_GC_TOTAL_TIME, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_MILLISECONDS, description: "Total time of GC" });
	this.register({ name: METRIC.PROCESS_GC_EXECUTED_TOTAL, type: METRIC.TYPE_GAUGE, labelNames: ["type"], unit: null, description: "Number of executed GC" });

	// --- OS METRICS ---

	this.register({ name: METRIC.OS_MEMORY_FREE, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_BYTE, description: "OS free memory size" });
	this.register({ name: METRIC.OS_MEMORY_TOTAL, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_BYTE, description: "OS total memory size" });
	this.register({ name: METRIC.OS_UPTIME, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_SECONDS, description: "OS uptime" });
	this.register({ name: METRIC.OS_TYPE, type: METRIC.TYPE_INFO, description: "OS type" }).set(os.type());
	this.register({ name: METRIC.OS_RELEASE, type: METRIC.TYPE_INFO, description: "OS release" }).set(os.release());
	this.register({ name: METRIC.OS_HOSTNAME, type: METRIC.TYPE_INFO, description: "Hostname" }).set(os.hostname());
	this.register({ name: METRIC.OS_ARCH, type: METRIC.TYPE_INFO, description: "OS architecture" }).set(os.arch());
	this.register({ name: METRIC.OS_PLATFORM, type: METRIC.TYPE_INFO, description: "OS platform" }).set(os.platform());

	const userInfo = getUserInfo();
	this.register({ name: METRIC.OS_USER_UID, type: METRIC.TYPE_INFO, description: "UID" }).set(userInfo.uid);
	this.register({ name: METRIC.OS_USER_GID, type: METRIC.TYPE_INFO, description: "GID" }).set(userInfo.gid);
	this.register({ name: METRIC.OS_USER_USERNAME, type: METRIC.TYPE_INFO, description: "Username" }).set(userInfo.username);
	this.register({ name: METRIC.OS_USER_HOMEDIR, type: METRIC.TYPE_INFO, description: "User's home directory" }).set(userInfo.homedir);

	this.register({ name: METRIC.OS_NETWORK_ADDRESS, type: METRIC.TYPE_INFO, labelNames: ["interface"], description: "Network address" });
	this.register({ name: METRIC.OS_NETWORK_FAMILY, type: METRIC.TYPE_INFO, labelNames: ["interface"], description: "Network family" });
	this.register({ name: METRIC.OS_NETWORK_MAC, type: METRIC.TYPE_INFO, labelNames: ["interface"], description: "MAC address" });

	this.register({ name: METRIC.OS_DATETIME_UNIX, type: METRIC.TYPE_GAUGE, description: "Current datetime in Unix format" });
	this.register({ name: METRIC.OS_DATETIME_ISO, type: METRIC.TYPE_INFO, description: "Current datetime in ISO string" });
	this.register({ name: METRIC.OS_DATETIME_UTC, type: METRIC.TYPE_INFO, description: "Current UTC datetime" });
	this.register({ name: METRIC.OS_DATETIME_TZ_OFFSET, type: METRIC.TYPE_GAUGE, description: "Timezone offset" });

	this.register({ name: METRIC.OS_CPU_LOAD_1, type: METRIC.TYPE_GAUGE, description: "CPU load1" });
	this.register({ name: METRIC.OS_CPU_LOAD_5, type: METRIC.TYPE_GAUGE, description: "CPU load5" });
	this.register({ name: METRIC.OS_CPU_LOAD_15, type: METRIC.TYPE_GAUGE, description: "CPU load15" });
	this.register({ name: METRIC.OS_CPU_UTILIZATION, type: METRIC.TYPE_GAUGE, description: "CPU utilization" });

	this.register({ name: METRIC.OS_CPU_USER, type: METRIC.TYPE_GAUGE, description: "CPU user time" });
	this.register({ name: METRIC.OS_CPU_SYSTEM, type: METRIC.TYPE_GAUGE, description: "CPU system time" });

	this.register({ name: METRIC.OS_CPU_TOTAL, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_CPU, description: "Number of CPUs" });
	this.register({ name: METRIC.OS_CPU_INFO_MODEL, type: METRIC.TYPE_INFO, labelNames: ["index"], description: "CPU model" });
	this.register({ name: METRIC.OS_CPU_INFO_SPEED, type: METRIC.TYPE_GAUGE, labelNames: ["index"], unit: METRIC.UNIT_GHZ, description: "CPU speed" });
	this.register({ name: METRIC.OS_CPU_INFO_TIMES_USER, type: METRIC.TYPE_GAUGE, labelNames: ["index"], description: "CPU user time" });
	this.register({ name: METRIC.OS_CPU_INFO_TIMES_SYS, type: METRIC.TYPE_GAUGE, labelNames: ["index"], description: "CPU system time" });

	this.logger.debug(`Registered ${this.store.size} common metrics.`);

	startGCWatcher.call(this);
}

/**
 * Start GC watcher listener.
 *
 */
function startGCWatcher() {
	if (gc) {
		gc.on("stats", stats => {
			this.set(METRIC.PROCESS_GC_TIME, stats.pause);
			this.increment(METRIC.PROCESS_GC_TOTAL_TIME, null, stats.pause / 1e6);
			if (stats.gctype == 1)
				this.increment(METRIC.PROCESS_GC_EXECUTED_TOTAL, { type: "scavenge" });
			if (stats.gctype == 2)
				this.increment(METRIC.PROCESS_GC_EXECUTED_TOTAL, { type: "marksweep" });
			if (stats.gctype == 4)
				this.increment(METRIC.PROCESS_GC_EXECUTED_TOTAL, { type: "incremental" });
			if (stats.gctype == 8)
				this.increment(METRIC.PROCESS_GC_EXECUTED_TOTAL, { type: "weakphantom" });
			if (stats.gctype == 15) {
				this.increment(METRIC.PROCESS_GC_EXECUTED_TOTAL, { type: "scavenge" });
				this.increment(METRIC.PROCESS_GC_EXECUTED_TOTAL, { type: "marksweep" });
				this.increment(METRIC.PROCESS_GC_EXECUTED_TOTAL, { type: "incremental" });
				this.increment(METRIC.PROCESS_GC_EXECUTED_TOTAL, { type: "weakphantom" });
			}
		});
	}
}

/**
 * Update common metric values.
 *
 * @returns {Promise}
 */
function updateCommonMetrics() {
	this.logger.debug("Update common metric values...");
	const end = this.timer(METRIC.MOLECULER_METRICS_COMMON_COLLECT_TIME);

	// --- PROCESS METRICS ---

	const procMem = process.memoryUsage();

	this.set(METRIC.PROCESS_MEMORY_HEAP_SIZE_TOTAL, procMem.heapTotal);
	this.set(METRIC.PROCESS_MEMORY_HEAP_SIZE_USED, procMem.heapUsed);
	this.set(METRIC.PROCESS_MEMORY_RSS, procMem.rss);
	this.set(METRIC.PROCESS_MEMORY_EXTERNAL, procMem.external);

	if (v8 && v8.getHeapSpaceStatistics) {
		const stat = v8.getHeapSpaceStatistics();
		stat.forEach(item => {
			const space = item.space_name;
			this.set(METRIC.PROCESS_MEMORY_HEAP_SPACE_SIZE_TOTAL, item.space_size, { space });
			this.set(METRIC.PROCESS_MEMORY_HEAP_SPACE_SIZE_USED, item.space_used_size, { space });
			this.set(METRIC.PROCESS_MEMORY_HEAP_SPACE_SIZE_AVAILABLE, item.space_available_size, { space });
			this.set(METRIC.PROCESS_MEMORY_HEAP_SPACE_SIZE_PHYSICAL, item.physical_space_size, { space });
		});
	}

	if (v8 && v8.getHeapStatistics) {
		const stat = v8.getHeapStatistics();
		this.set(METRIC.PROCESS_MEMORY_HEAP_STAT_HEAP_SIZE_TOTAL, stat.total_heap_size);
		this.set(METRIC.PROCESS_MEMORY_HEAP_STAT_EXECUTABLE_SIZE_TOTAL, stat.total_heap_size_executable);
		this.set(METRIC.PROCESS_MEMORY_HEAP_STAT_PHYSICAL_SIZE_TOTAL, stat.total_physical_size);
		this.set(METRIC.PROCESS_MEMORY_HEAP_STAT_AVAILABLE_SIZE_TOTAL, stat.total_available_size);
		this.set(METRIC.PROCESS_MEMORY_HEAP_STAT_USED_HEAP_SIZE, stat.used_heap_size);
		this.set(METRIC.PROCESS_MEMORY_HEAP_STAT_HEAP_SIZE_LIMIT, stat.heap_size_limit);
		this.set(METRIC.PROCESS_MEMORY_HEAP_STAT_MALLOCATED_MEMORY, stat.malloced_memory);
		this.set(METRIC.PROCESS_MEMORY_HEAP_STAT_PEAK_MALLOCATED_MEMORY, stat.peak_malloced_memory);
		this.set(METRIC.PROCESS_MEMORY_HEAP_STAT_ZAP_GARBAGE, stat.does_zap_garbage);
	}

	this.set(METRIC.PROCESS_UPTIME, process.uptime());
	this.set(METRIC.PROCESS_INTERNAL_ACTIVE_HANDLES, process._getActiveHandles().length);
	this.set(METRIC.PROCESS_INTERNAL_ACTIVE_REQUESTS, process._getActiveRequests().length);

	// --- OS METRICS ---

	this.set(METRIC.OS_MEMORY_FREE, os.freemem());
	this.set(METRIC.OS_MEMORY_TOTAL, os.totalmem());
	this.set(METRIC.OS_UPTIME, os.uptime());
	this.set(METRIC.OS_TYPE, os.type());
	this.set(METRIC.OS_RELEASE, os.release());
	this.set(METRIC.OS_HOSTNAME, os.hostname());
	this.set(METRIC.OS_ARCH, os.arch());
	this.set(METRIC.OS_PLATFORM, os.platform());

	// --- NETWORK INTERFACES ---

	const interfaces = os.networkInterfaces();
	for (let iface in interfaces) {
		for (let i in interfaces[iface]) {
			const f = interfaces[iface][i];
			if (!f.internal) {
				this.set(METRIC.OS_NETWORK_ADDRESS, f.address, { interface: iface });
				this.set(METRIC.OS_NETWORK_FAMILY, f.family, { interface: iface });
				this.set(METRIC.OS_NETWORK_MAC, f.mac, { interface: iface });
			}
		}
	}

	const d = new Date();
	this.set(METRIC.OS_DATETIME_UNIX, d.valueOf());
	this.set(METRIC.OS_DATETIME_ISO, d.toISOString());
	this.set(METRIC.OS_DATETIME_UTC, d.toUTCString());
	this.set(METRIC.OS_DATETIME_TZ_OFFSET, d.getTimezoneOffset());

	const load = os.loadavg();
	this.set(METRIC.OS_CPU_LOAD_1, load[0]);
	this.set(METRIC.OS_CPU_LOAD_5, load[1]);
	this.set(METRIC.OS_CPU_LOAD_15, load[2]);

	if (eventLoop.sense) {
		const stat = eventLoop.sense();
		this.set(METRIC.PROCESS_EVENTLOOP_LAG_MIN, stat.min);
		this.set(METRIC.PROCESS_EVENTLOOP_LAG_AVG, stat.num ? stat.sum / stat.num : 0);
		this.set(METRIC.PROCESS_EVENTLOOP_LAG_MAX, stat.max);
		this.set(METRIC.PROCESS_EVENTLOOP_LAG_COUNT, stat.num);
	}

	this.increment(METRIC.MOLECULER_METRICS_COMMON_COLLECT_TOTAL);
	const duration = end();

	return Promise.resolve()
		.then(() => cpuUsage().then(res => {
			this.set(METRIC.OS_CPU_UTILIZATION, res.avg);

			try {
				const cpus = os.cpus();
				this.set(METRIC.OS_CPU_TOTAL, cpus.length);
				this.set(METRIC.OS_CPU_USER, cpus.reduce((a,b) => a + b.times.user, 0));
				this.set(METRIC.OS_CPU_SYSTEM, cpus.reduce((a,b) => a + b.times.sys, 0));

				cpus.forEach((cpu, index) => {
					this.set(METRIC.OS_CPU_INFO_MODEL, cpu.model, { index });
					this.set(METRIC.OS_CPU_INFO_SPEED, cpu.speed, { index });
					this.set(METRIC.OS_CPU_INFO_TIMES_USER, cpu.times.user, { index });
					this.set(METRIC.OS_CPU_INFO_TIMES_SYS, cpu.times.sys, { index });
				});

			} catch(err) {
				// silent
			}
		}))
		.then(() => {
			this.logger.debug(`Collected common metric values in ${duration.toFixed(3)} msec.`);
		});
}

/**
 * Get OS user info (safe-mode)
 *
 * @returns
 */
function getUserInfo() {
	try {
		return os.userInfo();
	} catch (e) {
		return {};
	}
}

/**
 * Measure event loop lag.
 *
 * @returns {Promise<Number>}
 */
function measureEventLoopLag() {
	return new Promise(resolve => {
		const start = process.hrtime();
		setImmediate(() => {
			const delta = process.hrtime(start);
			resolve(delta[0] * 1e9 + delta[1]);
		});
	});
}

module.exports = {
	registerCommonMetrics,
	updateCommonMetrics
};
