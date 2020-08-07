"use strict";

let ServiceBroker = require("../src/service-broker");

// --- INVOKER

const broker1 = new ServiceBroker({
	nodeID: "broker1",
	internalServices: false,
	transporter: "NATS",
	tracing: {
		enabled: true,
		stackTrace: true,
		exporter: [
			{
				type: "Console",
				options: {
					width: 100,
					gaugeWidth: 30,
					logger: console.info
				}
			},
			{
				type: "Jaeger",
				options: {
					//endpoint: process.env.JAEGER,
					host: "192.168.0.181",
					sampler: {
						type: "const",
						options: {
						},
					},
					tracerOptions: {
					},
				},
			},
		],
	},
});

broker1.start()
	.then(() => {
		console.log("invoker started");
		setTimeout(async () => {
			const span = broker1.tracer.startSpan("Invoke service1.ping");
			const res = await broker1.call("service1.ping", null, { parentSpan: span });
			console.log(res);
			span.finish();
		}, 5000);

	});

// --- SERVICE 1 ---

const broker2 = new ServiceBroker({
	nodeID: "broker2",
	internalServices: false,
	transporter: "NATS",
	tracing: {
		enabled: true,
		stackTrace: true,
		exporter: [
			{
				type: "Console",
				options: {
					width: 100,
					gaugeWidth: 30,
					logger: console.info
				}
			},
			{
				type: "Jaeger",
				options: {
					//endpoint: process.env.JAEGER,
					host: "192.168.0.181",
					sampler: {
						type: "const",
						options: {
						},
					},
					tracerOptions: {
					},
				},
			},
		],
	},
});

broker2.createService({
	name: "service1",
	actions: {
		ping(ctx) {
			return new Promise((resolve) => {
				ctx.call("service2.ping")
					.then( (res) => {
						resolve( { service1: res } );
					});
			});
		}
	}
});

broker2.start()
	.then(() => {
		console.log("service1 started");

		//broker.call('service1.ping'); //<= called locally works

	});

// --- SERVICE 2 ---

const broker3 = new ServiceBroker({
	nodeID: "broker3",
	internalServices: false,
	transporter: "NATS",
	tracing: {
		enabled: true,
		stackTrace: true,
		exporter: [
			{
				type: "Console",
				options: {
					width: 100,
					gaugeWidth: 30,
					logger: console.info
				}
			},
			{
				type: "Jaeger",
				options: {
					//endpoint: process.env.JAEGER,
					host: "192.168.0.181",
					sampler: {
						type: "const",
						options: {
						},
					},
					tracerOptions: {
					},
				},
			},
		],
	},
});

broker3.createService({
	name: "service2",
	actions: {
		ping(ctx) {
			return Promise.resolve({ service2: "pong" });
		}
	}
});

broker3.start()
	.then(() => {
		console.log("service2 started");

		//broker.call('service2.ping'); //<= called locally works

	});
