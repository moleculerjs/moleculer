let _ = require("lodash");
let fakerator = require("fakerator")();

let Service = require("../src/service");

module.exports = function(broker) {
	let posts = fakerator.times(fakerator.entity.post, 10);

	_.each(posts, (post, i) => {
		post.id = i + 1;
		post.author = _.random(1, 5);
		//delete post.content;
		//delete post.keywords;
	});
	//console.log(posts);

	new Service(broker, {
		name: "posts",
		actions: {
			find: {
				cache: true,
				handler(ctx) {
					//ctx.log("find posts");
					let result = _.cloneDeep(posts);

					// Resolve authors
					let promises = result.map(post => {
						return broker.call("users.get", { id: post.author}, ctx).then(user => post.author = _.pick(user, ["userName", "email", "id", "firstName", "lastName"]));
					});

					return Promise.all(promises).then(() => {
						return ctx.result(result);
					});	
				}			
			},

			get(ctx) {
				//ctx.log("get post");
				return ctx.result(_.find(posts, post => post.id == ctx.params.id));
			},

			author(ctx) {
				//ctx.log("get post's author");
				return ctx.call("posts.get", ctx.params).then((post) => {
					return ctx.call("users.get", { id: post.author });
				});
			}
		},

		created() {
			console.log("Posts service created!");
		}
	
	});
};
