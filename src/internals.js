/*
 * moleculer
 * Copyright (c) 2020 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const { MoleculerClientError } = require("./errors");

module.exports = function() {
	const schema = {
		name: "$node",

		actions: {
			list: {
				cache: false,
				tracing: false,
				params: {
					withServices: { type: "boolean", optional: true, convert: true, default: false },
					onlyAvailable: { type: "boolean", optional: true, convert: true, default: false },
				},
				handler(ctx) {
					return this.broker.registry.getNodeList(ctx.params);
				}
			},

			services: {
				cache: false,
				tracing: false,
				params: {
					onlyLocal: { type: "boolean", optional: true, convert: true, default: false },
					skipInternal: { type: "boolean", optional: true, convert: true, default: false },
					withActions: { type: "boolean", optional: true, convert: true, default: false },
					withEvents: { type: "boolean", optional: true, convert: true, default: false },
					onlyAvailable: { type: "boolean", optional: true, convert: true, default: false },
					grouping: { type: "boolean", optional: true, convert: true, default: true },
				},
				handler(ctx) {
					return this.broker.registry.getServiceList(ctx.params);
				}
			},

			actions: {
				cache: false,
				tracing: false,
				params: {
					onlyLocal: { type: "boolean", optional: true, convert: true, default: false },
					skipInternal: { type: "boolean", optional: true, convert: true, default: false },
					withEndpoints: { type: "boolean", optional: true, convert: true, default: false },
					onlyAvailable: { type: "boolean", optional: true, convert: true, default: false },
				},
				handler(ctx) {
					return this.broker.registry.getActionList(ctx.params);
				}
			},

			events: {
				cache: false,
				tracing: false,
				params: {
					onlyLocal: { type: "boolean", optional: true, convert: true, default: false },
					skipInternal: { type: "boolean", optional: true, convert: true, default: false },
					withEndpoints: { type: "boolean", optional: true, convert: true, default: false },
					onlyAvailable: { type: "boolean", optional: true, convert: true, default: false },
				},
				handler(ctx) {
					return this.broker.registry.getEventList(ctx.params);
				}
			},

			health: {
				cache: false,
				tracing: false,
				handler() {
					return this.broker.getHealthStatus();
				}
			},

			options: {
				cache: false,
				tracing: false,
				params: {},
				handler() {
					return _.cloneDeep(this.broker.options);
				}
			},

			metrics: {
				cache: false,
				tracing: false,
				params: {
					types: { type: "multi", optional: true, rules: [ { type: "string" }, { type: "array", items: "string" } ] },
					includes: { type: "multi", optional: true, rules: [ { type: "string" }, { type: "array", items: "string" } ] },
					excludes: { type: "multi", optional: true, rules: [ { type: "string" }, { type: "array", items: "string" } ] }
				},
				handler(ctx) {
					if (!this.broker.isMetricsEnabled())
						return this.Promise.reject(new MoleculerClientError("Metrics feature is disabled", 400, "METRICS_DISABLED"));

					return this.broker.metrics.list(ctx.params);
				}
			}
		}
	};

	return schema;
};
