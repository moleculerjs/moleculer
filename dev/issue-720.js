"use strict";

const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
	logLevel: "debug",
	tracing: {
		enabled: true,
		// exporter: "Console"
		exporter: [
			{
				type: "Console",
				options: {
					excludes: ["math.**", "tester.**"]
				}
			}
		]
	}
});

broker.createService({
	name: "boolean",

	actions: {
		random: {
			handler() {
				return Boolean(Math.round(Math.random()));
			}
		}
	}
});

broker.createService({
	name: "math",

	actions: {
		random: {
			async handler(ctx) {
				const res = await ctx.call("boolean.random");
				return `Math.random() - ${res}`;
			}
		}
	}
});

broker.createService({
	name: "greeter",
	actions: {
		hello: {
			async handler(ctx) {
				const res = await ctx.call("math.random");
				return `Hello! - ${res}`;
			}
		}
	}
});

broker.createService({
	name: "tester",

	actions: {
		test: {
			handler(ctx) {
				return "This is a test";
			}
		}
	}
});

broker.start().then(async () => {
	// broker.repl();

	await broker.call("greeter.hello");

	await broker.call("math.random");

	await broker.call("tester.test");
});

/* Console Tracer exporter object
const console = {
	"478dfa65-a80c-4b8b-9483-90046f24f0b7": {
		span: {
			name: "action 'greeter.hello'",
			type: "action",
			id: "478dfa65-a80c-4b8b-9483-90046f24f0b7",
			traceID: "478dfa65-a80c-4b8b-9483-90046f24f0b7",
			parentID: null,
			service: { name: "greeter", fullName: "greeter" },
			priority: 5,
			sampled: true,
			startTime: 1662221480753,
			startTicks: 889.9804000854492,
			finishTime: 1662221480756.5515,
			duration: 3.551513671875,
			error: null,
			logs: [],
			tags: {
				callingLevel: 1,
				action: { name: "greeter.hello", rawName: "hello" },
				remoteCall: false,
				callerNodeID: "desktop-u6prr0v-14140",
				nodeID: "desktop-u6prr0v-14140",
				options: {},
				requestID: "478dfa65-a80c-4b8b-9483-90046f24f0b7",
				params: {},
				fromCache: false
			}
		},
		children: ["736d9a0a-b148-4fe4-8e1f-334911e8f9a5"]
	},
	"736d9a0a-b148-4fe4-8e1f-334911e8f9a5": {
		span: {
			name: "action 'math.random'",
			type: "action",
			id: "736d9a0a-b148-4fe4-8e1f-334911e8f9a5",
			traceID: "478dfa65-a80c-4b8b-9483-90046f24f0b7",
			parentID: "478dfa65-a80c-4b8b-9483-90046f24f0b7",
			service: { name: "math", fullName: "math" },
			priority: 5,
			sampled: true,
			startTime: 1662221480754,
			startTicks: 890.9318001270294,
			finishTime: 1662221480756.323,
			duration: 2.322998046875,
			error: null,
			logs: [],
			tags: {
				callingLevel: 2,
				action: { name: "math.random", rawName: "random" },
				remoteCall: false,
				callerNodeID: "desktop-u6prr0v-14140",
				nodeID: "desktop-u6prr0v-14140",
				options: {},
				requestID: "478dfa65-a80c-4b8b-9483-90046f24f0b7",
				params: {},
				fromCache: false
			}
		},
		children: ["329c75f5-fe8d-4faf-8eff-bbfd7d8bb8ed"]
	},
	"329c75f5-fe8d-4faf-8eff-bbfd7d8bb8ed": {
		span: {
			name: "action 'boolean.random'",
			type: "action",
			id: "329c75f5-fe8d-4faf-8eff-bbfd7d8bb8ed",
			traceID: "478dfa65-a80c-4b8b-9483-90046f24f0b7",
			parentID: "736d9a0a-b148-4fe4-8e1f-334911e8f9a5",
			service: { name: "boolean", fullName: "boolean" },
			priority: 5,
			sampled: true,
			startTime: 1662221480755,
			startTicks: 891.814199924469,
			finishTime: 1662221480755.8572,
			duration: 0.857177734375,
			error: null,
			logs: [],
			tags: {
				callingLevel: 3,
				action: { name: "boolean.random", rawName: "random" },
				remoteCall: false,
				callerNodeID: "desktop-u6prr0v-14140",
				nodeID: "desktop-u6prr0v-14140",
				options: {},
				requestID: "478dfa65-a80c-4b8b-9483-90046f24f0b7",
				params: {},
				fromCache: false
			}
		},
		children: []
	}
};
*/
