const _ = require("lodash");
const fakerator = require("fakerator")();

const { delay, randomInt } = require("../../src/utils");

module.exports = function () {
	let posts = fakerator.times(fakerator.entity.post, 10);

	for (let i = 0; i < posts.length; i++) {
		const post = posts[i];

		post.id = i + 1;
		post.author = randomInt(1, 5);
	}

	return {
		name: "posts",
		actions: {
			find: {
				cache: true,
				handler(ctx) {
					//this.logger.debug("Find posts...");
					let result = _.cloneDeep(posts);

					// Resolve authors
					let promises = result.map(post => {
						return ctx
							.call("users.get", { id: post.author })
							.then(
								user =>
									(post.author = _.pick(user, [
										"userName",
										"email",
										"id",
										"firstName",
										"lastName"
									]))
							);
					});

					return Promise.all(promises).then(() => {
						return result;
					});
				}
			},

			delayed() {
				return Promise.resolve()
					.then(delay(6000))
					.then(() => {
						return this.actions.find();
					});
			},

			get: {
				cache: {
					keys: ["id"]
				},
				handler(ctx) {
					// this.logger.debug("Get post...", ctx.params);
					let post = _.cloneDeep(posts.find(post => post.id == ctx.params.id));
					return ctx.call("users.get", { id: post.author }).then(user => {
						post.author = _.pick(user, [
							"userName",
							"email",
							"id",
							"firstName",
							"lastName"
						]);
						return post;
					});
				}
			},

			author(ctx) {
				//ctx.log("get post's author");
				return ctx.call("posts.get", ctx.params).then(post => {
					return ctx.call("users.get", { id: post.author });
				});
			}
		}
	};
};
