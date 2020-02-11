"use strict";

const _ = require("lodash");
const H = require("./helpers");

const POSTS = [
	{ id: 1, title: "Post 1", author: 3 },
	{ id: 2, title: "Post 2", author: 1 },
	{ id: 3, title: "Post 3", author: 2 },
	//{ id: 4, title: "Post 4", author: 3 },
	//{ id: 5, title: "Post 5", author: 4 },
];

const USERS = [
	{ id: 1, name: "Walter White" },
	{ id: 2, name: "Jesse Pinkman" },
	{ id: 3, name: "Hank Schrader" },
	{ id: 4, name: "Saul Goodman" },
	{ id: 5, name: "Mike Ehrmantraut" },
];

function getSpanFields(store) {
	return store.map(o => {
		o = _.omit(o, ["startTime", "duration", "finishTime"]);
		o.logs = o.logs.map(entry => _.omit(entry, ["elapsed", "time"]));
		return o;
	});
}

describe("Test Tracing feature with actions", () => {

	let idCounter = 1;

	const COMMON_SETTINGS = {
		logger: false,
		namespace: "tracing",
		//transporter: "NATS",
		tracing: {
			enabled: true,
			events: true,
			exporter: {
				type: "Event",
				options: {
					interval: 0
				}
			}
		},
		uidGenerator: broker => `${broker.nodeID}-${idCounter++}`
	};

	const STORE = [];

	const broker0 = H.createNode(_.defaultsDeep({ nodeID: "broker-0" }, COMMON_SETTINGS), [{
		name: "tracing-collector",
		events: {
			"$tracing.spans"(ctx) {
				STORE.push(...ctx.params);
			}
		}
	}]);

	const broker1 = H.createNode(_.defaultsDeep({ nodeID: "broker-1" }, COMMON_SETTINGS), [{
		name: "posts",
		actions: {
			list: {
				async handler(ctx) {
					const posts = _.cloneDeep(POSTS);

					await Promise.all(posts.map(async post => {
						const author = await ctx.call("users.get", { id: post.author });
						post.author = author; //eslint-disable-line
						return post;
					}));

					return posts;
				}
			}
		},
		events: {
			"comments.removed"(ctx) {
				const span1 = ctx.startSpan("update posts");
				ctx.broadcast("post.updated");
				ctx.finishSpan(span1);

				const span2 = ctx.startSpan("update others");
				ctx.broadcast("user.updated");
				ctx.finishSpan(span2);
			},

			"post.updated"(ctx) {
				ctx.span.log("some changes", { a: 5 });
			}
		}
	}]);

	const broker2 = H.createNode(_.defaultsDeep({ nodeID: "broker-2" }, COMMON_SETTINGS), [{
		name: "users",
		actions: {
			get: {
				tracing: {
					spanName: ctx => `Get user by ID: ${ctx.params.id}`,
					tags: {
						response: ["name"]
					}
				},

				async handler(ctx) {
					let user = USERS.find(user => user.id == ctx.params.id);
					if (user) {
						const span = ctx.startSpan("cloning", { tags: {
							userID: user.id
						} });
						user = _.cloneDeep(user);
						Promise.delay(5);
						ctx.finishSpan(span);

						user.friends = await ctx.call("friends.count", { id: user.id });
					}
					return user;
				}
			}
		},
		events: {
			"user.updated": {
				tracing: {
					spanName: "User updated event"
				},
				async handler(ctx) {
					const span1 = ctx.startSpan("updating user");
					// TODO: not perfect. Its parent is the event span and not span1
					await ctx.call("friends.count", { userID: 2 });
					ctx.finishSpan(span1);
				}
			}
		}
	}]);

	const broker3 = H.createNode(_.defaultsDeep({ nodeID: "broker-3" }, COMMON_SETTINGS), [{
		name: "friends",
		actions: {
			count: {
				tracing: {
					tags: {
						meta: ["user.name"]
					}
				},
				async handler(ctx) {
					return ctx.params.id * 2;
				}
			}
		}
	}]);

	beforeAll(() => Promise.all([
		broker0.start(),
		broker1.start(),
		broker2.start(),
		broker3.start(),
	]));

	afterAll(() => Promise.all([
		broker0.stop(),
		broker1.stop(),
		broker2.stop(),
		broker3.stop(),
	]));

	it("should generate action spans", async () => {
		idCounter = 1;

		const res = await broker1.call("posts.list", null, {
			meta: {
				user: {
					id: 100,
					name: "Superuser"
				}
			}
		});

		expect(res).toMatchSnapshot();

		//Promise.delay(200);
		STORE.sort((a,b) => a.startTime - b.startTime);

		const spans = getSpanFields(STORE);

		expect(spans).toMatchSnapshot();
	});

	it("should generate event spans", async () => {
		idCounter = 1;
		STORE.length = 0;

		await broker1.emit("comments.removed", null, {
			meta: {
				user: {
					id: 100,
					name: "Superuser"
				}
			}
		});

		await Promise.delay(500);

		STORE.sort((a,b) => a.startTime - b.startTime);

		const spans = getSpanFields(STORE);

		expect(spans).toMatchSnapshot();
	});

});

