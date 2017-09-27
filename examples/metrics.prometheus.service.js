"use strict";

const express = require("express");

const server = express();

/**
 */
module.exports = {
	name: "prometheus",
	settings: {
		collectDefaultMetrics: false,
		timeout: 10 * 1000
	},

	events: {
		"metrics.trace.span.finish"(payload) {
			//this.logger.info("Metric finish", payload);

			let parts = payload.action.name.split(".");
			parts.pop();
			let serviceName = parts.join(".");

			this.metrics.call.total.inc({ action: payload.action.name, service: serviceName, nodeID: payload.nodeID });
			this.metrics.call.duration.observe({ action: payload.action.name, service: serviceName, nodeID: payload.nodeID }, payload.duration);

			if (payload.error) {
				this.metrics.call.error.inc({ action: payload.action.name, service: serviceName, nodeID: payload.nodeID, errorCode: payload.error.code, errorName: payload.error.name, errorType: payload.error.type ? payload.error.type : "" });
			}
		},

		"$services.changed"() {
			this.updateCommonValues();
		},

		"$node.connected"() {
			this.updateCommonValues();
		},

		"$node.disconnected"() {
			this.updateCommonValues();
		}
	},

	methods: {
		createMetrics() {
			this.metrics = {
				common: {
					nodes: new this.client.Gauge({ name: "moleculer_nodes_total", help: "Moleculer nodes count" }),
					services: new this.client.Gauge({ name: "moleculer_services_total", help: "Moleculer services count" }),
					actions: new this.client.Gauge({ name: "moleculer_actions_total", help: "Moleculer actions count" }),
					events: new this.client.Gauge({ name: "moleculer_events_total", help: "Moleculer event subscriptions" })
				},

				node: {
					list: new this.client.Gauge({ name: "moleculer_node_list", labelNames: [ "nodeID", "type", "version", "langVersion" ], help: "Moleculer node list" })
				},

				action: {
					endpoints: new this.client.Gauge({ name: "moleculer_action_endpoint_total", labelNames: [ "action" ], help: "Moleculer action endpoints" }),
				},

				service: {
					endpoints: new this.client.Gauge({ name: "moleculer_service_endpoint_total", labelNames: [ "service", "version" ], help: "Moleculer service endpoints" }),
				},

				event: {
					endpoints: new this.client.Gauge({ name: "moleculer_event_endpoint_total", labelNames: [ "event", "group" ], help: "Moleculer event endpoints" }),
				},

				call: {
					total: new this.client.Counter({ name: "moleculer_call_total", labelNames: [ "action", "service", "nodeID" ], help: "Moleculer action call count"}),
					error: new this.client.Counter({ name: "moleculer_call_error_total", labelNames: [ "action", "service", "nodeID", "errorCode", "errorName", "errorType" ], help: "Moleculer error call count"}),
					duration: new this.client.Histogram({ name: "moleculer_call_duration_ms", labelNames: [ "action", "service", "nodeID" ], help: "Moleculer call duration"}),
				}
			};

			this.updateCommonValues();
		},

		updateCommonValues() {
			if (!this.metrics) return;

			this.broker.mcall({
				nodes: { action: "$node.list" },
				services: { action: "$node.services", params: { withActions: false, skipInternal: true } },
				actions: { action: "$node.actions", params: { withEndpoints: true, skipInternal: true } },
				events: { action: "$node.events", params: { withEndpoints: true, skipInternal: true } }
			}).then(({ nodes, services, actions, events}) => {

				this.metrics.common.nodes.set(nodes.filter(node => node.available).length);
				nodes.forEach(node => this.metrics.node.list.set({ nodeID: node.id, type: node.client.type, version: node.client.version, langVersion: node.client.langVersion }, node.available ? 1 : 0));

				this.metrics.common.services.set(services.length);
				services.forEach(svc => this.metrics.service.endpoints.set({ service: svc.name, version: svc.version }, svc.nodes.length));

				this.metrics.common.actions.set(actions.length);
				actions.forEach(action => this.metrics.action.endpoints.set({ action: action.name }, action.endpoints ? action.endpoints.length : 0));

				this.metrics.common.events.set(events.length);
				events.forEach(event => this.metrics.event.endpoints.set({ event: event.name, group: event.group }, event.endpoints ? event.endpoints.length : 0));
			});
		}
	},

	started() {
		this.client = require("prom-client");

		if (this.settings.collectDefaultMetrics) {
			this.timer = this.client.collectDefaultMetrics({ timeout: this.settings.timeout });
		}

		this.createMetrics();

		server.get("/metrics", (req, res) => {
			res.set("Content-Type", this.client.contentType);
			res.end(this.client.register.metrics());
		});

		server.listen(3333);
	},

	stopped() {
		if (this.timer)
			clearInterval(this.timer);
	}

};
