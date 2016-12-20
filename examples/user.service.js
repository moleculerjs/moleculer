let _ = require("lodash");
let fakerator = require("fakerator")();

let Service = require("../src/service");

module.exports = function(broker) {
	let users = fakerator.times(fakerator.entity.user, 10);

	_.each(users, (user, i) => user.id = i);

	new Service(broker, {
		name: "users",
		actions: {
			find(ctx) {
				ctx.log("find users");
				return ctx.result(users);
			},

			get: {
				cache: true,
				handler(ctx) {
					ctx.log("get user");
					return ctx.result(this.findByID(ctx.params.id));
				}
			}
		},

		methods: {
			findByID(id) {
				return _.find(users, user => user.id == id);
			}
		},

		created() {
			console.log("Users service created!");
		}
	});
};
