const _ = require("lodash");
const fakerator = require("fakerator")();
const { ValidationError } = require("../../src/errors");

const { delay } = require("../../src/utils");

let users = fakerator.times(fakerator.entity.user, 10);

_.each(users, (user, i) => user.id = i + 1);
let c = 0;

module.exports = function(broker) {
	return new broker.ServiceFactory(broker, {
		name: "users",

		actions: {
			find: {
				cache: false,
				handler() {
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

			delayed() {
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
				return _.cloneDeep(users.find(user => user.id == id));
			}
		}
	});
};
