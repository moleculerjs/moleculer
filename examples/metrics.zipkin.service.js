"use strict";

let axios = require("axios");

module.exports = {
	name: "zipkin",
	events: {
		/*"metrics.trace.span.start"(metric) {
			//this.logger.info("Metric start", metric);
			let serviceName = metric.action.name.split(".")[0];
			const payload = {
				id: metric.id.replace(/-/g, ""),
				traceId: metric.requestID,
				name: metric.action.name,
				parentId: metric.parent ? metric.parent.replace(/-/g, "") : null,
				annotations: [
					{
						"endpoint": {
							"serviceName": serviceName,
							"ipv4": 0,
							"port": 0
						},
						"timestamp": Math.round(metric.startTime * 1000),
						"value": "sr"
					}
				],
				binaryAnnotations: [
					{
						key: "nodeID",
						value: metric.nodeID
					},
					{
						key: "level",
						value: metric.level.toString()
					},
					{
						key: "remoteCall",
						value: metric.remoteCall.toString()
					},
					{
						key: "callerNodeID",
						value: metric.callerNodeID ? metric.callerNodeID : ""
					}
				],
				timestamp: Math.round(metric.startTime * 1000)
			};

			//this.logger.info("Finish", metric.action.name, payload);

			axios.post("http://192.168.51.29:9411/api/v1/spans", [payload])
				.then(res => this.logger.info("OK"))
				.catch(err => this.logger.error(err.response.data));

		},*/

		"metrics.trace.span.finish"(metric) {
			//this.logger.info("Metric finish", metric);

			let serviceName = metric.action.name.split(".")[0];

			const payload = {
				traceId: metric.requestID,
				name: metric.action.name,
				id: metric.id.replace(/-/g, ""),
				parentId: metric.parent ? metric.parent.replace(/-/g, "") : null,
				annotations: [
					{
						"endpoint": {
							"serviceName": serviceName,
							"ipv4": "",
							"port": 0
						},
						"timestamp": Math.round(metric.startTime * 1000),
						"value": "sr"
					},
					{
						"endpoint": {
							"serviceName": serviceName,
							"ipv4": "",
							"port": 0
						},
						"timestamp": Math.round(metric.endTime * 1000),
						//"duration": Math.round(metric.duration * 1000),
						"value": "ss"
					}
				],
				binaryAnnotations: [
					{
						key: "nodeID",
						value: metric.nodeID
					},
					{
						key: "level",
						value: metric.level.toString()
					},
					{
						key: "remoteCall",
						value: metric.remoteCall.toString()
					},
					{
						key: "callerNodeID",
						value: metric.callerNodeID ? metric.callerNodeID : ""
					}
				],
				timestamp: Math.round(metric.endTime * 1000)
			};

			//this.logger.info("Finish", metric.action.name, payload);

			axios.post("http://192.168.51.29:9411/api/v1/spans", [payload])
				.then(res => this.logger.info("OK"))
				.catch(err => this.logger.error(err.response.data));

		}
	}

};
