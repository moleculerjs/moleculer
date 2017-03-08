//let _ = require("lodash");
let fakerator = require("fakerator")();
let Promise	= require("bluebird");

let Service = require("../src/service");

module.exports = function(broker) {
	let users = fakerator.times(fakerator.entity.user, 10);

	users.forEach((user, i) => user.id = i + 1);

	return new Service(broker, {
		name: "users",
		actions: {
			find: {
				cache: true,
				handler(ctx) {
					return users;
				}
			},

			get: {
				cache: true,
				handler(ctx) {
					return users.find(user => user.id == ctx.params.id);
				}
			},

			get2: {
				cache: {
					keys: ["id"]
				},
				handler(ctx) {
					return users.find(user => user.id == ctx.params.id);
				}
			},

			nocache: {
				cache: false,
				handler(ctx) {
					return users.find(user => user.id == ctx.params.id);
				}
			},

			validate: {
				cache: false,
				params: {
					id: { type: "number", integer: true, min: 1 }
				},
				handler(ctx) {
					return users.find(user => user.id == ctx.params.id);
				}
			},			
			
			empty(ctx) {
				return [];
			}
		}
	});
};
