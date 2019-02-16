module.exports = {
	namespace: "metric",

	transporter: process.env.TRANSPORTER || "NATS",

	cacher: process.env.CACHER || "MemoryLRU",

	retryPolicy: {
		enabled: false,
		retries: 3
	},

	circuitBreaker: {
		enabled: false,
		threshold: 0.3,
		windowTime: 30,
		minRequestCount: 10
	},
	logger: console,
	logLevel: "info",
	logFormatter: "short",

	metrics: {
		enabled: true,
		reporter: [
			/*{
				type: "Console",
				options: {
					includes: "moleculer.registry.**",
					//excludes: ["moleculer.transit.publish.total", "moleculer.transit.receive.total"]
				}
			},*/
			/*{
				type: "Prometheus",
				options: {
					port: 3031
				}
			},*/
			{
				type: "Datadog",
				options: {
					includes: "moleculer.**"
				}
			}
		]
	},

	nodeSettings: {
		client: {
			reqInterval: 1000
		},
		service: {
			chanceToCallOtherService: 0.75,
			waitMin: 10,
			waitMax: 500,
			changeToThrowError: 0.02
		}
	}
};
