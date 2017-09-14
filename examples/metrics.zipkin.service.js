"use strict";

let axios = require("axios");

function convertID(id) {
	return id && typeof(id) == "string" ? id.replace(/-/g, "") : id;
}

function convertTime(ts) {
	return Math.round(ts * 1000);
}

/**
 * Running Zipkin in Docker:
 *
 * 	 docker run -d -p 9411:9411 --name=zipkin openzipkin/zipkin
 */
module.exports = {
	name: "zipkin",
	settings: {
		zipkin: {
			host: "http://192.168.51.29:9411"
		}
	},
	events: {
		"metrics.trace.span.finish"(metric) {
			this.logger.info("Metric finish", metric);

			let parts = metric.action.name.split(".");
			parts.pop();
			let serviceName = parts.join(".");

			const payload = {
				name: metric.action.name,

				// Trace & span IDs
				traceId: convertID(metric.requestID),
				id: convertID(metric.id),
				parentId: convertID(metric.parent),

				// Annotations
				annotations: [
					{
						endpoint: { serviceName: serviceName, ipv4: "", port: 0 },
						timestamp: convertTime(metric.startTime),
						value: "sr"
					},
					{
						endpoint: { serviceName: serviceName, ipv4: "", port: 0 },
						timestamp: convertTime(metric.endTime),
						value: "ss"
					}
				],

				// Binary annotations
				binaryAnnotations: [
					{ key: "nodeID", 		value: metric.nodeID },
					{ key: "level", 		value: metric.level.toString() },
					{ key: "remoteCall", 	value: metric.remoteCall.toString() },
					{ key: "callerNodeID", 	value: metric.callerNodeID ? metric.callerNodeID : "" }
				],

				timestamp: convertTime(metric.endTime)
			};

			if (metric.error) {
				payload.binaryAnnotations.push({
					key: "error",
					value: metric.error.message
				});

				payload.annotations.push({
					value: "error",
					endpoint: { serviceName: serviceName, ipv4: "", port: 0 },
					timestamp: convertTime(metric.endTime)
				});
			}

			axios.post(`${this.settings.zipkin.host}/api/v1/spans`, [payload])
				.then(() => this.logger.debug(`Span '${payload.id}' sent. Trace ID: ${payload.traceId}`))
				.catch(err => this.logger.error("Span sending error!", err.response.data));

		}
	}

};
