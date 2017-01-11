let _ = require("lodash");
let fakerator = require("fakerator")();
let Promise	= require("bluebird");

let Service = require("../src/service");

module.exports = function(broker) {
	let users = fakerator.times(fakerator.entity.user, 10);

	_.each(users, (user, i) => user.id = i + 1);

	return new Service(broker, {
		name: "users",
		actions: {
			find(ctx) {
				return users;
			},

			get(ctx) {
				return _.find(users, user => user.id == ctx.params.id);
			},

			empty(ctx) {
				return [];
			}
		}
	});
};
