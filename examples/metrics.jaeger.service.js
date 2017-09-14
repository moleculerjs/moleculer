"use strict";

/**
 * Jaeger metrics service
 *
 * http://jaeger.readthedocs.io/en/latest/getting_started/#all-in-one-docker-image
 *
 * Running Jaeger in Docker:
 *
 * 	docker run -d --name jaeger -p5775:5775/udp -p6831:6831/udp -p6832:6832/udp -p5778:5778 -p16686:16686 -p14268:14268 jaegertracing/all-in-one:latest
 *
 * 	UI: http://192.168.51.29:16686/
 */

module.exports = {
	name: "jaeger",

	events: {
		"metrics.trace.span.finish"(metric) {
		}
	}
};
