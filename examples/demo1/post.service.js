let _ = require("lodash");
let fakerator = require("fakerator")();

let Service = require("../../src/service");

module.exports = function(broker) {
	let posts = fakerator.times(fakerator.entity.post, 10);

	_.each(posts, (post, i) => {
		post.id = i;
		post.author = i;
	});

	new Service(broker, {
		name: "posts",
		actions: {
			find(ctx) {
				ctx.log("find posts");
				return ctx.result(posts);
			},

			get(ctx) {
				ctx.log("get post");
				return ctx.result(_.find(posts, post => post.id == ctx.params.id));
			},

			author(ctx) {
				ctx.log("get post's author");
				return ctx.call("posts.get", ctx.params).then((post) => {
					return ctx.call("users.get", { id: post.author });
				});
			}
		}
	});
};
