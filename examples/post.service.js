let _ = require("lodash");
let fakerator = require("fakerator")();

let posts = fakerator.times(fakerator.entity.post, 10);

_.each(posts, (post, i) => {
	post.id = i + 1;
	post.author = _.random(1, 5);
	//delete post.content;
	//delete post.keywords;
});
//console.log(posts);

module.exports = {
	name: "posts",
	actions: {
		find: {
			cache: true,
			handler(ctx) {
				this.logger.debug("Find posts...");
				let result = _.cloneDeep(posts);

				// Resolve authors
				let promises = result.map(post => {
					return ctx.call("users.get", { id: post.author}).then(user => post.author = _.pick(user, ["userName", "email", "id", "firstName", "lastName"]));
				});

				return Promise.all(promises).then(() => {
					return result;
				});	
			}			
		},

		get(ctx) {
			this.logger.debug("Get post...", ctx.params);
			return _.find(posts, post => post.id == ctx.params.id);
		},

		author(ctx) {
			//ctx.log("get post's author");
			return ctx.call("posts.get", ctx.params).then((post) => {
				return ctx.call("users.get", { id: post.author });
			});
		}
	},

	created() {
		this.logger.info("Posts service created!");
	}
};
