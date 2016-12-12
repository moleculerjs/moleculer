let _ = require("lodash");
let fakerator = require("fakerator")();

let Service = require("../../src/service");

module.exports = function(broker) {
	let cache = {};

	new Service(broker, {
		name: "cache",
		actions: {
			get(ctx) {
				return new Promise((resolve) => {
					let key = ctx.params.key;

					let item = cache[key];
					if (item) { 
						console.log(`[Cache] GET ${key}`);
						resolve(item.data);
						// Update expire time (hold in the cache if we are using it)
						//item.expire = Date.now() + ttl * 1000;
					}
					else 
						resolve(null);
				});
			},

			put(ctx) {
				let key = ctx.params.key;
				cache[key] = {
					data: ctx.params.data
					//expire: Date.now() + ttl * 1000
				};
				console.log(`[Cache] SET ${key}`);
				return Promise.resolve(ctx.params.data);
			}
		}
	});
};
