let _ = require("lodash");
let fakerator = require("fakerator")();

let users = fakerator.times(fakerator.entity.user, 10);

_.each(users, (user, i) => user.id = i + 1);
//console.log(users);

module.exports = {
	name: "users",
	actions: {
		find(ctx) {
			this.logger.debug("Find users...");
			return ctx.result(users);
		},

		get: {
			cache: true,
			handler(ctx) {
				this.logger.debug("Get user...", ctx.params);
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
		this.logger.info("Users service created!");
	}
};
