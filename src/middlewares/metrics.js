/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { METRIC }	= require("../metrics");

module.exports = function MetricsMiddleware(broker) {
	const metrics = broker.metrics;

	function getActionHandler(type, actionDef, next) {
		const action = actionDef.name;
		const service = actionDef.service ? actionDef.service.fullName : null;

		return function metricsMiddleware(ctx) {
			const caller = ctx.caller;

			metrics.increment(METRIC.MOLECULER_REQUEST_TOTAL, { service, action, caller, type });
			metrics.increment(METRIC.MOLECULER_REQUEST_ACTIVE, { service, action, caller, type });
			metrics.increment(METRIC.MOLECULER_REQUEST_LEVELS, { service, action, caller, level: ctx.level });
			const timeEnd = metrics.timer(METRIC.MOLECULER_REQUEST_TIME, { service, action, caller });

			// Call the next handler
			return next(ctx).then(res => {
				timeEnd();
				metrics.decrement(METRIC.MOLECULER_REQUEST_ACTIVE, { service, action, caller, type });
				return res;
			}).catch(err => {
				timeEnd();
				metrics.decrement(METRIC.MOLECULER_REQUEST_ACTIVE, { service, action, caller, type });
				metrics.increment(METRIC.MOLECULER_REQUEST_ERROR_TOTAL, {
					service,
					action,
					caller,
					type,
					errorName: err ? err.name : null,
					errorCode: err ? err.code : null,
					errorType: err ? err.type : null
				});
				throw err;
			});

		};
	}

	return {
		name: "Metrics",

		created() {
			if (broker.isMetricsEnabled()) {
				// --- MOLECULER REQUEST METRICS ---
				metrics.register({ name: METRIC.MOLECULER_REQUEST_TOTAL, type: METRIC.TYPE_COUNTER, labelNames: ["service", "action", "type", "caller"], unit: METRIC.UNIT_REQUEST, description: "Number of requests", rate: true });
				metrics.register({ name: METRIC.MOLECULER_REQUEST_ACTIVE, type: METRIC.TYPE_GAUGE, labelNames: ["service", "action", "type", "caller"], unit: METRIC.UNIT_REQUEST, description: "Number of active requests" });
				metrics.register({ name: METRIC.MOLECULER_REQUEST_ERROR_TOTAL, type: METRIC.TYPE_COUNTER, labelNames: ["service", "action", "type", "caller", "errorName", "errorCode", "errorType"], unit: METRIC.UNIT_REQUEST, description: "Number of request errors", rate: true });
				metrics.register({ name: METRIC.MOLECULER_REQUEST_TIME, type: METRIC.TYPE_HISTOGRAM, labelNames: ["service", "action", "caller"], quantiles: true, buckets: true, unit: METRIC.UNIT_MILLISECONDS, description: "Request times in milliseconds", rate: true });
				metrics.register({ name: METRIC.MOLECULER_REQUEST_LEVELS, type: METRIC.TYPE_COUNTER, labelNames: ["level"], unit: METRIC.UNIT_REQUEST, description: "Number of requests by context level" });
				//metrics.register({ name: METRIC.MOLECULER_REQUEST_DIRECTCALL_TOTAL, type: METRIC.TYPE_COUNTER, labelNames: ["action"], unit: METRIC.UNIT_REQUEST, description: "Number of direct calls", rate: true });
				//metrics.register({ name: METRIC.MOLECULER_REQUEST_MULTICALL_TOTAL, type: METRIC.TYPE_COUNTER, unit: METRIC.UNIT_REQUEST, description: "Number of multicalls", rate: true });

				// --- MOLECULER EVENTS METRICS ---
				metrics.register({ name: METRIC.MOLECULER_EVENT_EMIT_TOTAL, type: METRIC.TYPE_COUNTER, labelNames: ["event", "groups"], unit: METRIC.UNIT_EVENT, description: "Number of emitted events", rate: true });
				metrics.register({ name: METRIC.MOLECULER_EVENT_BROADCAST_TOTAL, type: METRIC.TYPE_COUNTER, labelNames: ["event", "groups"], unit: METRIC.UNIT_EVENT, description: "Number of broadcast events", rate: true });
				metrics.register({ name: METRIC.MOLECULER_EVENT_BROADCASTLOCAL_TOTAL, type: METRIC.TYPE_COUNTER, labelNames: ["event", "groups"], unit: METRIC.UNIT_EVENT, description: "Number of local broadcast events", rate: true });
				metrics.register({ name: METRIC.MOLECULER_EVENT_RECEIVED_TOTAL, type: METRIC.TYPE_COUNTER, labelNames: ["service", "group", "event"], unit: METRIC.UNIT_EVENT, description: "Number of received events", rate: true });

				// --- MOLECULER TRANSIT METRICS ---

				metrics.register({ name: METRIC.MOLECULER_TRANSIT_PUBLISH_TOTAL, type: METRIC.TYPE_COUNTER, labelNames: ["type"], unit: METRIC.UNIT_PACKET, description: "Number of published packets", rate: true });
				metrics.register({ name: METRIC.MOLECULER_TRANSIT_RECEIVE_TOTAL, type: METRIC.TYPE_COUNTER, labelNames: ["type"], unit: METRIC.UNIT_PACKET, description: "Number of received packets", rate: true });

				metrics.register({ name: METRIC.MOLECULER_TRANSIT_REQUESTS_ACTIVE, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_REQUEST, description: "Number of active requests." });
				metrics.register({ name: METRIC.MOLECULER_TRANSIT_STREAMS_SEND_ACTIVE, type: METRIC.TYPE_GAUGE, unit: METRIC.UNIT_STREAM, description: "Number of active sent streams" });
				//metrics.register({ name: METRIC.MOLECULER_TRANSIT_STREAMS_RECEIVE_ACTIVE, type: METRIC.TYPE_GAUGE, description: "" });

				// --- MOLECULER TRANSPORTER METRICS ---

				metrics.register({ name: METRIC.MOLECULER_TRANSPORTER_PACKETS_SENT_TOTAL, type: METRIC.TYPE_COUNTER, unit: METRIC.UNIT_PACKET, description: "Number of sent packets", rate: true });
				metrics.register({ name: METRIC.MOLECULER_TRANSPORTER_PACKETS_SENT_BYTES, type: METRIC.TYPE_COUNTER, unit: METRIC.UNIT_BYTE, description: "Number of sent bytes" });
				metrics.register({ name: METRIC.MOLECULER_TRANSPORTER_PACKETS_RECEIVED_TOTAL, type: METRIC.TYPE_COUNTER, unit: METRIC.UNIT_PACKET, description: "Number of received packets", rate: true });
				metrics.register({ name: METRIC.MOLECULER_TRANSPORTER_PACKETS_RECEIVED_BYTES, type: METRIC.TYPE_COUNTER, unit: METRIC.UNIT_BYTE, description: "Number of received packets" });
			}
		},

		localAction(next, action) {
			if (broker.isMetricsEnabled())
				return getActionHandler("local", action, next);

			return next;
		},

		remoteAction(next, action) {
			if (broker.isMetricsEnabled())
				return getActionHandler("remote", action, next);

			return next;
		},

		// Wrap local event handlers
		localEvent(next, event) {
			const service = event.service ? event.service.name : null;
			if (broker.isMetricsEnabled()) {
				return function metricsMiddleware(ctx) {
					metrics.increment(METRIC.MOLECULER_EVENT_RECEIVED_TOTAL, { service, event: ctx.eventName, group: event.group || service });
					return next.apply(this, arguments);
				}.bind(this);
			}

			return next;
		},

		// Wrap broker.emit method
		emit(next) {
			if (broker.isMetricsEnabled()) {
				return function metricsMiddleware(/* event, payload */) {
					metrics.increment(METRIC.MOLECULER_EVENT_EMIT_TOTAL, { event: arguments[0] });
					return next.apply(this, arguments);
				};
			}
			return next;
		},

		// Wrap broker.broadcast method
		broadcast(next) {
			if (broker.isMetricsEnabled()) {
				return function metricsMiddleware(/* event, payload */) {
					metrics.increment(METRIC.MOLECULER_EVENT_BROADCAST_TOTAL, { event: arguments[0] });
					return next.apply(this, arguments);
				};
			}
			return next;
		},

		// Wrap broker.broadcastLocal method
		broadcastLocal(next) {
			if (broker.isMetricsEnabled()) {
				return function metricsMiddleware(/* event, payload */) {
					metrics.increment(METRIC.MOLECULER_EVENT_BROADCASTLOCAL_TOTAL, { event: arguments[0] });
					return next.apply(this, arguments);
				};
			}
			return next;
		},

		// When transit publishing a packet
		transitPublish(next) {
			const transit = this;
			if (broker.isMetricsEnabled()) {
				return function metricsMiddleware(/* packet */) {
					metrics.increment(METRIC.MOLECULER_TRANSIT_PUBLISH_TOTAL, { type: arguments[0].type });

					const p = next.apply(this, arguments);

					metrics.increment(METRIC.MOLECULER_TRANSIT_REQUESTS_ACTIVE, null, transit.pendingRequests.size);
					//metrics.increment(METRIC.MOLECULER_TRANSIT_STREAMS_RECEIVE_ACTIVE, null, transit.);
					metrics.increment(METRIC.MOLECULER_TRANSIT_STREAMS_SEND_ACTIVE, null, transit.pendingReqStreams.size + this.pendingResStreams.size);

					return p;
				};
			}
			return next;
		},

		// When transit receives & handles a packet
		transitMessageHandler(next) {
			if (broker.isMetricsEnabled()) {
				return function metricsMiddleware(/* cmd, packet */) {
					metrics.increment(METRIC.MOLECULER_TRANSIT_RECEIVE_TOTAL, { type: arguments[0] });
					return next.apply(this, arguments);
				};
			}
			return next;
		},

		// When transporter send data
		transporterSend(next) {
			if (broker.isMetricsEnabled()) {
				return function metricsMiddleware(/* topic, data, meta */) {
					const data = arguments[1];
					metrics.increment(METRIC.MOLECULER_TRANSPORTER_PACKETS_SENT_TOTAL);
					metrics.increment(METRIC.MOLECULER_TRANSPORTER_PACKETS_SENT_BYTES, null, data && data.length ? data.length : 0);
					return next.apply(this, arguments);
				};
			}
			return next;
		},

		// When transporter received data
		transporterReceive(next) {
			if (broker.isMetricsEnabled()) {
				return function metricsMiddleware(/* cmd, data, s */) {
					const data = arguments[1];
					metrics.increment(METRIC.MOLECULER_TRANSPORTER_PACKETS_RECEIVED_TOTAL);
					metrics.increment(METRIC.MOLECULER_TRANSPORTER_PACKETS_RECEIVED_BYTES, null, data && data.length ? data.length : 0);
					return next.apply(this, arguments);
				};
			}
			return next;
		}

	};
};
