"use strict";

const ServiceBroker = require("../src/service-broker");
"use strict";

const { MoleculerError } 	= require("../src/errors");
const _ 					= require("lodash");
const { inspect }			= require("util");

const THROW_ERR = false;

// Create broker
const broker = new ServiceBroker({
	logger: console,
	logLevel: "info",
	logObjectPrinter: o => inspect(o, { showHidden: false, depth: 4, colors: true, breakLength: 50 }),
	tracing: {
		events: true,
		stackTrace: true,
		exporter: [
			{
				type: "Console",
				options: {
					logger: console
				}
			},
			/*{
				type: "Datadog",
				options: {
					agentUrl: "http://192.168.0.181:8126/v0.4/traces",
				}
			},*/
			{
				type: "Datadog2",
				options: {
					agentUrl: "http://192.168.0.181:8126",
					samplingPriority: "USER_KEEP",
					tracerOptions: {
						debug: true,
					}
				}
			},
			/*{
				type: "Zipkin",
				options: {
					baseURL: "http://192.168.0.181:9411",
				}
			},
			{
				type: "Jaeger",
				options: {
					host: "192.168.0.181",
				}
			}*/
			/*{
				type: "Event",
				options: {
				}
			}*/
			/*{
				type: "EventLegacy"
			}*/
		]
	}
});

// Load Zipkin service
/*broker.createService({
	mixins: [JaegerService],
	settings: {
		host: "192.168.0.181"
	}
});*/

const POSTS = [
	{ id: 1, title: "First post", content: "Content of first post", author: 2 },
	{ id: 2, title: "Second post", content: "Content of second post", author: 1 },
	{ id: 3, title: "3rd post", content: "Content of 3rd post", author: 2 },
];

broker.createService({
	name: "posts",
	actions: {
		find: {
			handler(ctx) {
				const posts = _.cloneDeep(POSTS);
				return this.Promise.all(posts.map(post => {
					return this.Promise.all([
						ctx.call("users.get", { id: post.author }).then(author => post.author = author),
						ctx.call("votes.count", { postID: post.id }).then(votes => post.votes = votes),
					]);
				})).then(() => posts);
				//return posts;
			}
		}
	}
});

const USERS = [
	{ id: 1, name: "John Doe" },
	{ id: 2, name: "Jane Doe" },
];

broker.createService({
	name: "users",
	actions: {
		get: {
			tracing: {
				tags: ["id", "#loggedIn.username"],
			},
			handler(ctx) {
				return this.Promise.resolve()
					.then(() => {
						const user = USERS.find(user => user.id == ctx.params.id);
						if (user) {
							const res = _.cloneDeep(user);
							return ctx.call("friends.count", { userID: user.id })
								.then(friends => res.friends = friends)
								.then(() => res);
						}
					});
			}
		}
	}
});

broker.createService({
	name: "votes",
	actions: {
		count: {
			tracing: {
				tags: ctx => {
					return {
						params: ctx.params,
						meta: ctx.meta,
						custom: {
							a: 5
						}
					};
				}
			},
			handler(ctx) {
				return this.Promise.resolve().delay(10 + _.random(30)).then(() => ctx.params.postID * 3);
			}
		}
	}
});

broker.createService({
	name: "friends",
	actions: {
		count: {
			tracing: true,
			handler(ctx) {
				if (THROW_ERR && ctx.params.userID == 1)
					throw new MoleculerError("Friends is not found!", 404, "FRIENDS_NOT_FOUND", { userID: ctx.params.userID });

				return this.Promise.resolve().delay(10 + _.random(60)).then(() => ctx.params.userID * 3);
			}
		}
	}
});

broker.createService({
	name: "event-handler",
	events: {
		"$tracing.spans"(payload) {
			this.logger.info("Tracing event received", payload);
		},
		"metrics.trace.span.start"(payload) {
			this.logger.info("Legacy tracing start event received");
		},
		"metrics.trace.span.finish"(payload) {
			this.logger.info("Legacy tracing finish event received", payload);
		}
	}
});

broker.createService({
	name: "api",
	actions: {
		rest: {
			handler(ctx) {
				return ctx.call(ctx.params.action, ctx.params.params);
			}
		}
	},
	created() {
		const http = require("http");
		this.server = http.createServer();
		this.server.on("request", async (req, res) => {
			try {
				const data = await this.broker.call("api.rest", {
					action: "posts.find"
				});
				res.setHeader("Content-Type", "application/json; charset=utf-8");
				res.end(JSON.stringify(data));
			} catch(err) {
				res.statusCode = 500;
				res.end(err.message);
			}
		});
	},

	started() {
		this.server.listen(3000);
	},

	stopped() {
		this.server.close();
	}
});

// Start server
broker.start().then(() => {
	broker.repl();

	// Call action
	//setInterval(() => {
	/*broker
		.call("posts.find", { limit: 5 }, { meta: { loggedIn: { username: "Adam" } } })
		.then(console.log)
		.catch(console.error);
*/
	//}, 5000);
});
