let _ = require("lodash");
let fakerator = require("fakerator")();
let Service = require("../src/service");

let users = fakerator.times(fakerator.entity.user, 10);

_.each(users, (user, i) => user.id = i + 1);

module.exports = function(broker) {
	return new Service(broker, {
		name: "users",
		actions: {
			find: {
				cache: false,
				handler(ctx) {
					//this.logger.debug("Find users...");
					return users;
					//return _.cloneDeep(users);
				}
			},

			get: {
				cache: true,
				handler(ctx) {
					//this.logger.debug("Get user...", ctx.params);
					return this.findByID(ctx.params.id);
				}
			}
		},

		methods: {
			findByID(id) {
				return _.cloneDeep(_.find(users, user => user.id == id));
			}
		}
	});
};
