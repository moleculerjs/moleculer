/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird");
const _ = require("lodash");

/**
 * Moleculer Tracer class
 */
class Tracer {

	/**
	 * Creates an instance of Tracer.
	 *
	 * @param {ServiceBroker} broker
	 * @param {Object} opts
	 * @memberof Tracer
	 */
	constructor(broker, opts) {
		this.broker = broker;
		this.logger = broker.getLogger("tracer");

		if (opts === true || opts === false)
			opts = { enabled: opts };

		this.opts = _.defaults({}, opts, {
			enabled: true,
			sampling: {
				rate: 1.0, // 0.0, 0.5
				window: null // 1000msec (ratelimiting sampling https://opencensus.io/tracing/sampling/ratelimited/ )
			},

			actions: true,
			methods: false,
			events: false,

			stackTrace: false,

			defaultTags: null,
		});

		if (this.opts.enabled)
			this.logger.info("Tracing: Enabled");
		else
			this.logger.info("Tracing: Disabled");
	}

	/**
	 * Initialize Tracer.
	 */
	init() {
		if (this.opts.enabled) {

			// Create Reporter instances
			if (this.opts.reporter) {
				const reporters = Array.isArray(this.opts.reporter) ? this.opts.reporter : [this.opts.reporter];

				this.reporter = reporters.map(r => {
					/*const reporter = Reporters.resolve(r);
					reporter.init(this);
					return reporter;
					*/
				});
			}
		}
	}

	startSpan(opts) {

	}

	stopSpan(opts) {

	}

	extract() {

	}

	inject() {

	}

}

module.exports = Tracer;
