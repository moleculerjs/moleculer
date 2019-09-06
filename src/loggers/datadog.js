/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseLogger = require("./base");
const _ = require("lodash");
const os = require("os");
const fetch = require("node-fetch");
fetch.Promise = Promise;
const { MoleculerError } = require("../errors");

const util = require("util");
const { makeDirs } = require("../utils");

/*
	docker run -d --name dd-agent --restart unless-stopped -v /var/run/docker.sock:/var/run/docker.sock:ro -v /proc/:/host/proc/:ro -v /sys/fs/cgroup/:/host/sys/fs/cgroup:ro -e DD_API_KEY=123456 -e DD_APM_ENABLED=true -e DD_APM_NON_LOCAL_TRAFFIC=true -p 8126:8126  datadog/agent:latest
*/

/**
 * Datadog logger for Moleculer
 *
 * @class DatadogLogger
 * @extends {BaseLogger}
 */
class DatadogLogger extends BaseLogger {

	/**
	 * Creates an instance of DatadogLogger.
	 * @param {Object} opts
	 * @memberof DatadogLogger
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {
			url: "https://http-intake.logs.datadoghq.com/v1/input/",
			apiKey: process.env.DATADOG_API_KEY,
			ddSource: "moleculer",
			env: undefined,
			hostname: os.hostname(),
			interval: 10 * 1000
		});

		this.queue = [];
		this.timer = null;

		if (!this.opts.apiKey)
			throw new MoleculerError("Datadog API key is missing. Set DATADOG_API_KEY environment variable.");
	}

	/**
	 * Initialize logger.
	 *
	 * @param {LoggerFactory} loggerFactory
	 */
	init(loggerFactory) {
		super.init(loggerFactory);

		this.objectPrinter = this.opts.objectPrinter ? this.opts.objectPrinter : o => util.inspect(o, { showHidden: false, depth: 2, colors: false, breakLength: Number.POSITIVE_INFINITY });

		if (this.opts.interval > 0) {
			this.timer = setInterval(() => this.flush(), this.opts.interval);
			this.timer.unref();
		}
	}

	/**
	 * Generate a new log handler.
	 *
	 * @param {object} bindings
	 */
	getLogHandler(bindings) {
		let level = bindings ? this.getLogLevel(bindings.mod) : null;
		if (!level)
			return null;

		const printArgs = args => {
			return args.map(p => {
				if (_.isObject(p) || _.isArray(p))
					return this.objectPrinter(p);
				return p;
			});
		};
		const levelIdx = BaseLogger.LEVELS.indexOf(level);

		return (type, args) => {
			const typeIdx = BaseLogger.LEVELS.indexOf(type);
			if (typeIdx > levelIdx) return;

			this.queue.push({ ts: Date.now(), level: type, msg: printArgs(args).join(" "), bindings });
			if (!this.opts.interval) this.flush();
		};
	}

	getTags(row) {
		return [
			{ name: "env", value: this.opts.env || "" },
			{ name: "nodeID", value: row.bindings.nodeID },
			{ name: "namespace", value: row.bindings.ns },
		]
			.map(row => `${row.name}:${row.value}`).join(",");
	}

	/**
	 * Flush queued log entries to Datadog.
	 */
	flush() {
		if (this.queue.length > 0) {
			const rows = Array.from(this.queue);
			this.queue.length = 0;

			const data = rows.map(row => {
				// {"message":"hello world", "ddsource":"moleculer", "ddtags":"env:,user:icebob", "hostname":"bobcsi-pc"}

				return {
					timestamp: row.ts,
					level: row.level,
					message: row.msg,
					nodeID: row.bindings.nodeID,
					namespace: row.bindings.ns,
					service: row.bindings.svc,
					version: row.bindings.ver,

					ddsource: this.opts.ddSource,
					ddtags: this.getTags(row),
					hostname: this.opts.hostname
				};
			});

			return fetch(this.opts.url + this.opts.apiKey, {
				method: "post",
				body: JSON.stringify(data),
				headers: {
					"Content-Type": "application/json",
				}
			}).then(res => {
				// console.info("Logs are uploaded to DataDog. Status: ", res.statusText);
			}).catch(err => {
				/* istanbul ignore next */
				console.warn("Unable to upload logs to Datadog server. Error:" + err.message, err); // eslint-disable-line no-console
			});
		}
	}
}

module.exports = DatadogLogger;
