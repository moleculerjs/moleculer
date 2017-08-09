let _ = require("lodash");
let fakerator = require("fakerator")();
const Promise = require("bluebird");

let { delay } = require("../src/utils");

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
					//this.logger.debug("Find posts...");
					let result = _.cloneDeep(posts);
					if (ctx.params.limit)
						result = result.slice(0, ctx.params.limit);

					// Resolve authors
					let promises = result.map(post => {
						return ctx.call("v2.users.get", { id: post.author}).then(user => post.author = _.pick(user, ["userName", "email", "id", "firstName", "lastName", "postsCount"]));
					});

					return Promise.all(promises).then(() => {
						return result;
					});	
				}			
			},

			delayed(ctx) {
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
					return ctx.call("v2.users.get", { id: post.author, withPostCount: true }).then(user => {
						post.author = _.pick(user, ["userName", "email", "id", "firstName", "lastName", "postsCount"]);
						return post;
					});
				}
			},

			author(ctx) {
				//ctx.log("get post's author");
				return ctx.call("posts.get", ctx.params).then((post) => {
					return ctx.call("v2.users.get", { id: post.author });
				});
			},

			count(ctx) {
				this.logger.info("count called");
				let count = posts.filter(post => post.author == ctx.params.id).length;
				//return Promise.delay(1500).then(() => count);
				return count;
			},

			slowGet(ctx) {
				return Promise.delay(2000).then(() => {
					this.logger.info("slowGet called");
					let post = _.cloneDeep(posts.find(post => post.id == ctx.params.id));
					return ctx.call("v2.users.slowGet", { id: post.author, withPostCount: true }).then(user => {
						post.author = _.pick(user, ["userName", "email", "id", "firstName", "lastName", "postsCount"]);
						return post;
					});
				}).catch(err => {
					this.logger.error(err);
				});
			}
		}
	};
};