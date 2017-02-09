let _ = require("lodash");
let fakerator = require("fakerator")();
let Service = require("../src/service");
let { ValidationError } = require("../src/errors");
const Promise = require("bluebird");

let { delay } = require("../src/utils");

let users = fakerator.times(fakerator.entity.user, 10);

_.each(users, (user, i) => user.id = i + 1);
let c = 0;

module.exports = function(broker) {
	return new Service(broker, {
		name: "users",
		version: 2,
		latestVersion: true,
		
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
				cache: {
					keys: ["id"]
				},
				handler(ctx) {
					//this.logger.debug("Get user...", ctx.params);
					return this.findByID(ctx.params.id);
				}
			},

			dangerous() {
				//return Promise.reject(new Error("Something went wrong!"));
				return Promise.reject(new ValidationError("Wrong params!"));
			},

			delayed(ctx) {
				c++;
				return Promise.resolve()
					.then(delay(c < 3 ? 6000 : 1000))
					.then(() => {
						return users;
					});
			}			
		},

		methods: {
			findByID(id) {
				return _.cloneDeep(_.find(users, user => user.id == id));
			}
		}
	});
};
