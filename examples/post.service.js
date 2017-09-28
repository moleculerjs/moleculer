"use strict";

let _ 			= require("lodash");
let fakerator 	= require("fakerator")();

module.exports = function() {
	let posts = fakerator.times(fakerator.entity.post, 10);

	_.each(posts, (post, i) => {
		post.id = i + 1;
		post.author = _.random(1, 5);
	});

	return {
		name: "posts",
		actions: {
			find: {
				cache: true,
				handler(ctx) {
					let result = _.cloneDeep(posts);
					if (ctx.params.limit)
						result = result.slice(0, ctx.params.limit);

					// Resolve authors
					return this.Promise.all(result.map(post => ctx.call("v2.users.get", { id: post.author})
						.then(user => post.author = _.pick(user, ["userName", "email", "id", "firstName", "lastName", "postsCount"]))))
						.then(() => result);
				}
			},

			delayed() {
				return this.Promise.resolve()
					.delay(6000)
					.then(() => this.actions.find());
			},

			get: {
				cache: {
					keys: ["id"]
				},
				handler(ctx) {
					let post = _.cloneDeep(posts.find(post => post.id == ctx.params.id));
					return ctx.call("v2.users.get", { id: post.author, withPostCount: true }).then(user => {
						post.author = _.pick(user, ["userName", "email", "id", "firstName", "lastName", "postsCount"]);
						return post;
					});
				}
			},

			author(ctx) {
				return ctx.call("posts.get", ctx.params)
					.then((post) => ctx.call("v2.users.get", { id: post.author }));
			},

			count(ctx) {
				return posts.filter(post => post.author == ctx.params.id).length;
			},

			slowGet(ctx) {
				let post = _.cloneDeep(posts.find(post => post.id == ctx.params.id));
				return this.Promise.delay(2000)
					.then(() => ctx.call("v2.users.slowGet", { id: post.author, withPostCount: true }))
					.then(user => {
						post.author = _.pick(user, ["userName", "email", "id", "firstName", "lastName", "postsCount"]);
						return post;
					})
					.catch(err => this.logger.error(err));
			}
		}
	};
};
