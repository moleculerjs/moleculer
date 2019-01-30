/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const chalk = require("chalk");
const Promise = require("bluebird");
const _ = require("lodash");
const os = require("os");
const METRIC = require("./constants");
const Types = require("./types");
const cpuUsage = require("../cpu-usage");
/**
 * Metric Registry class
 */
class MetricRegistry {

	/**
	 * Constructor of MetricRegistry
	 */
	constructor(broker, opts) {
		this.broker = broker;
		this.logger = broker.getLogger("metrics");

		if (opts === true || opts === false)
			opts = { enabled: opts };

		this.opts = _.defaultsDeep({}, opts, {
			enabled: true,
			collectProcessMetrics: true,
			collectInterval: 5 * 1000,
			//notifyInterval: 5 * 1000
		});

		this.store = new Map();

		if (this.opts.enabled)
			this.logger.info("Metrics: ENABLED");
		else
			this.logger.info("Metrics: Disabled");
	}

	/**
	 * Start Metric Registry
	 */
	init() {
		if (this.opts.enabled) {
			this.collectTimer = setInterval(() => {
				this.updateCommonMetrics();
			}, this.opts.collectInterval);

			/*this.notifyTimer = setInterval(() => {

			}, this.opts.notifyInterval);*/

			this.registerCommonMetrics();
			this.updateCommonMetrics();
		}
	}

	/**
	 * Stop Metric Registry
	 *
	 * TODO: need to call?
	 */
	stop() {
		clearInterval(this.collectTimer);
		//clearInterval(this.notifyTimer);
	}

	register(opts) {
		if (!_.isPlainObject(opts))
			throw new Error("Wrong argument. Must be an Object.");

		if (!opts.type)
			throw new Error("The 'type' property is mandatory");

		if (!opts.name)
			throw new Error("The 'name' property is mandatory");

		const MetricClass = Types.getByType(opts.type);
		if (!MetricClass)
			throw new Error(`Invalid '${opts.type}' metric type`);

		if (!this.opts.enabled)
			return null;

		const item = new MetricClass(opts);
		this.store.set(opts.name, item);
		return item;
	}

	hasMetric(name) {
		return this.store.has(name);
	}

	getMetric(name) {
		if (!this.opts.enabled)
			return null;

		const item = this.store.get(name);
		if (!item)
			throw new Error(`Metric '${name}' is not exist.`);

		return item;
	}

	increment(name, labels, value = 1, timestamp) {
		if (!this.opts.enabled)
			return null;

		const item = this.getMetric(name);
		if (!_.isFunction(item.increment))
			throw new Error("Invalid metric type. Incrementing works only with counter & gauge metric types");

		return item.increment(labels, value, timestamp);
	}

	decrement(name, labels, value = -1, timestamp) {
		if (!this.opts.enabled)
			return null;

		const item = this.getMetric(name);
		if (!_.isFunction(item.decrement))
			throw new Error("Invalid metric type. Decrementing works only with gauge metric type");

		return item.decrement(labels, value, timestamp);
	}

	set(name, value, labels, timestamp) {
		if (!this.opts.enabled)
			return null;

		const item = this.getMetric(name);
		if (!_.isFunction(item.set))
			throw new Error("Invalid metric type. Value setting works only with counter, gauge & info metric types");

		return item.set(value, labels, timestamp);
	}

	observe(name, value, labels, timestamp) {
		if (!this.opts.enabled)
			return null;

		const item = this.getMetric(name);
		if (!_.isFunction(item.observe))
			throw new Error("Invalid metric type. Observing works only with histogram metric type.");

		return item.observe(value, labels, timestamp);
	}

	get(name, labels) {
		if (!this.opts.enabled)
			return null;

		const item = this.getMetric(name);
		return item.get(labels);
	}

	reset(name, labels, timestamp) {
		if (!this.opts.enabled)
			return null;

		const item = this.getMetric(name);
		item.reset(labels, timestamp);
	}

	resetAll(name, timestamp) {
		if (!this.opts.enabled)
			return null;

		if (!name) {
			this.store.clear();
		}

		const item = this.getMetric(name);
		item.resetAll(timestamp);
	}

	timer(name, labels, timestamp) {
		let item;
		if (name && this.opts.enabled) {
			item = this.getMetric(name);
			if (!_.isFunction(item.observe) && !_.isFunction(item.set))
				throw new Error("Invalid metric type. Timing works only with histogram or gauge metric types");
		}

		const start = process.hrtime();
		return () => {
			const delta = process.hrtime(start);
			const duration = (delta[0] + delta[1] / 1e9) * 1000;

			if (item) {
				if (item.type == METRIC.TYPE_HISTOGRAM)
					item.observe(duration, labels, timestamp);
				else if (item.type == METRIC.TYPE_GAUGE)
					item.set(duration, labels, timestamp);
			}

			return duration;
		};
	}

	registerCommonMetrics() {
		this.logger.debug("Registering common metrics...");

		// --- METRICS SELF METRICS ---

		this.register({ name: METRIC.MOLECULER_METRICS_COMMON_COLLECT_TOTAL, type: METRIC.TYPE_COUNTER }),
		this.register({ name: METRIC.MOLECULER_METRICS_COMMON_COLLECT_TIME, type: METRIC.TYPE_GAUGE });

		// --- PROCESS METRICS ---

		this.register({ name: METRIC.PROCESS_ARGUMENTS, type: METRIC.TYPE_INFO }).set(process.argv);
		this.register({ name: METRIC.PROCESS_PID, type: METRIC.TYPE_INFO }).set(process.pid);
		this.register({ name: METRIC.PROCESS_PPID, type: METRIC.TYPE_INFO }).set(process.ppid);

		this.register({ name: METRIC.PROCESS_EVENTLOOP_LAG, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_MILLISECONDS });

		this.register({ name: METRIC.PROCESS_MEMORY_HEAP_SIZE_TOTAL, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_BYTE });
		this.register({ name: METRIC.PROCESS_MEMORY_HEAP_SIZE_USED, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_BYTE });
		this.register({ name: METRIC.PROCESS_MEMORY_RSS, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_BYTE });
		this.register({ name: METRIC.PROCESS_MEMORY_EXTERNAL, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_BYTE });

		this.register({ name: METRIC.PROCESS_MEMORY_HEAP_SPACE_SIZE_TOTAL, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_BYTE });
		this.register({ name: METRIC.PROCESS_MEMORY_HEAP_SPACE_SIZE_USED, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_BYTE });
		this.register({ name: METRIC.PROCESS_MEMORY_HEAP_SPACE_SIZE_AVAILABLE, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_BYTE });

		this.register({ name: METRIC.PROCESS_UPTIME, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_SECONDS });
		this.register({ name: METRIC.PROCESS_ACTIVE_HANDLES, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_HANDLE });
		this.register({ name: METRIC.PROCESS_ACTIVE_REQUESTS, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_REQUEST });

		// --- GARBAGE COLLECTOR METRICS ---

		this.register({ name: METRIC.PROCESS_GC_TIME, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_MILLISECONDS });
		this.register({ name: METRIC.PROCESS_GC_SCAVENGE, type: METRIC.TYPE_GAUGE, unit: null });
		this.register({ name: METRIC.PROCESS_GC_MARKSWEEP, type: METRIC.TYPE_GAUGE, unit: null });

		// --- OS METRICS ---

		this.register({ name: METRIC.OS_MEMORY_FREE, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_BYTE });
		this.register({ name: METRIC.OS_MEMORY_TOTAL, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_BYTE });
		this.register({ name: METRIC.OS_CPU_TOTAL, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_CPU });
		this.register({ name: METRIC.OS_UPTIME, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_SECONDS });
		this.register({ name: METRIC.OS_TYPE, type: METRIC.TYPE_INFO }).set(os.type());
		this.register({ name: METRIC.OS_RELEASE, type: METRIC.TYPE_INFO }).set(os.release());
		this.register({ name: METRIC.OS_HOSTNAME, type: METRIC.TYPE_INFO }).set(os.hostname());
		this.register({ name: METRIC.OS_ARCH, type: METRIC.TYPE_INFO }).set(os.arch());
		this.register({ name: METRIC.OS_PLATFORM, type: METRIC.TYPE_INFO }).set(os.platform());

		const userInfo = this.getUserInfo();
		this.register({ name: METRIC.OS_USER_UID, type: METRIC.TYPE_INFO }).set(userInfo.uid);
		this.register({ name: METRIC.OS_USER_GID, type: METRIC.TYPE_INFO }).set(userInfo.gid);
		this.register({ name: METRIC.OS_USER_USERNAME, type: METRIC.TYPE_INFO }).set(userInfo.username);
		this.register({ name: METRIC.OS_USER_HOMEDIR, type: METRIC.TYPE_INFO }).set(userInfo.homedir);

		this.register({ name: METRIC.OS_DATETIME_UNIX, type: METRIC.TYPE_INFO });
		this.register({ name: METRIC.OS_DATETIME_ISO, type: METRIC.TYPE_INFO });
		this.register({ name: METRIC.OS_DATETIME_UTC, type: METRIC.TYPE_INFO });

		this.register({ name: METRIC.OS_CPU_LOAD_1, type: METRIC.TYPE_GAUGE });
		this.register({ name: METRIC.OS_CPU_LOAD_5, type: METRIC.TYPE_GAUGE });
		this.register({ name: METRIC.OS_CPU_LOAD_15, type: METRIC.TYPE_GAUGE });
		this.register({ name: METRIC.OS_CPU_UTILIZATION, type: METRIC.TYPE_GAUGE });

		this.register({ name: METRIC.OS_CPU_USER, type: METRIC.TYPE_GAUGE });
		this.register({ name: METRIC.OS_CPU_SYSTEM, type: METRIC.TYPE_GAUGE });

		// TODO NETWORKS

		this.logger.debug(`Registered ${this.store.size} common metrics.`);
	}

	updateCommonMetrics() {
		this.logger.debug("Update common metric values...");
		const end = this.timer(METRIC.MOLECULER_METRICS_COMMON_COLLECT_TIME);

		// --- PROCESS METRICS ---

		const procMem = process.memoryUsage();

		this.set(METRIC.PROCESS_MEMORY_HEAP_SIZE_TOTAL, procMem.heapTotal);
		this.set(METRIC.PROCESS_MEMORY_HEAP_SIZE_USED, procMem.heapUsed);
		this.set(METRIC.PROCESS_MEMORY_RSS, procMem.rss);
		this.set(METRIC.PROCESS_MEMORY_EXTERNAL, procMem.external);

		this.set(METRIC.PROCESS_MEMORY_HEAP_SPACE_SIZE_TOTAL, null);
		this.set(METRIC.PROCESS_MEMORY_HEAP_SPACE_SIZE_USED, null);
		this.set(METRIC.PROCESS_MEMORY_HEAP_SPACE_SIZE_AVAILABLE, null);

		this.set(METRIC.PROCESS_UPTIME, process.uptime());
		this.set(METRIC.PROCESS_ACTIVE_HANDLES, process._getActiveHandles().length);
		this.set(METRIC.PROCESS_ACTIVE_REQUESTS, process._getActiveRequests().length);

		// --- GARBAGE COLLECTOR METRICS ---

		//this.set(METRIC.PROCESS_GC_TIME, null);
		//this.set(METRIC.PROCESS_GC_SCAVENGE, null);
		//this.set(METRIC.PROCESS_GC_MARKSWEEP, null);

		// --- OS METRICS ---

		this.set(METRIC.OS_MEMORY_FREE, os.freemem());
		this.set(METRIC.OS_MEMORY_TOTAL, os.totalmem());
		this.set(METRIC.OS_CPU_TOTAL, os.cpus().length);
		this.set(METRIC.OS_UPTIME, os.uptime());
		this.set(METRIC.OS_TYPE, os.type());
		this.set(METRIC.OS_RELEASE, os.release());
		this.set(METRIC.OS_HOSTNAME, os.hostname());
		this.set(METRIC.OS_ARCH, os.arch());
		this.set(METRIC.OS_PLATFORM, os.platform());

		this.set(METRIC.OS_DATETIME_UNIX, Date.now());
		this.set(METRIC.OS_DATETIME_ISO, new Date().toISOString());
		this.set(METRIC.OS_DATETIME_UTC, new Date().toUTCString());

		const load = os.loadavg();
		this.set(METRIC.OS_CPU_LOAD_1, load[0]);
		this.set(METRIC.OS_CPU_LOAD_5, load[1]);
		this.set(METRIC.OS_CPU_LOAD_15, load[2]);

		return Promise.resolve()
			.then(() => this.measureEventLoopLag().then(lag => this.set(METRIC.PROCESS_EVENTLOOP_LAG, lag / 1000)))
			.then(() => cpuUsage().then(res => {
				this.set(METRIC.OS_CPU_UTILIZATION, res.avg);

				try {
					const cpus = os.cpus();
					this.set(METRIC.OS_CPU_USER, cpus.reduce((a,b) => a + b.times.user, 0));
					this.set(METRIC.OS_CPU_SYSTEM, cpus.reduce((a,b) => a + b.times.sys, 0));

				} catch(err) {
					// silent
				}
			}))
			.then(() => {
				this.increment(METRIC.MOLECULER_METRICS_COMMON_COLLECT_TOTAL);
				const duration = end();
				this.logger.debug(`Collected common metric values in ${duration} msec.`);
				this.debugPrint();
			});
	}

	getUserInfo() {
		try {
			return os.userInfo();
		} catch (e) {
			return {};
		}
	}

	measureEventLoopLag() {
		return new Promise(resolve => {
			const start = process.hrtime();
			setImmediate(() => {
				const delta = process.hrtime(start);
				resolve(delta[0] * 1e9 + delta[1]);
			});
		});
	}

	debugPrint() {
		const labelsToStr = labels => {
			const keys = Object.keys(labels);
			if (keys.length == 0)
				return chalk.gray("<Not defined>");

			return keys.map(key => `${key}: ${chalk.green(labels[key])}`).join(", ");
		};
		const log = console.log;

		log("------------------------------------------------------------------");

		this.store.forEach(item => {
			log(`Name: ${chalk.cyan.bold(item.name)}, Type: ${item.type}`);
			const values = item.values;
			values.forEach((valueItem, hash) => {
				let val;
				switch(item.type) {
					case METRIC.TYPE_COUNTER:
					case METRIC.TYPE_GAUGE:
					case METRIC.TYPE_INFO:
						val = chalk.green.bold(valueItem.value);
						break;
					case METRIC.TYPE_HISTOGRAM:
						val = chalk.green.bold(item.toString());
						break;
				}
				log(`  Labels: ${labelsToStr(valueItem.labels)}, Value: ${val} ${item.unit ? chalk.gray(item.unit) : ""}`);
			});
			log("");
		});


		log("------------------------------------------------------------------");
	}
}

module.exports = MetricRegistry;
