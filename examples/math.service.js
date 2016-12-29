let Service = require("../src/service");

module.exports = function(broker) {
	return new Service(broker, {
		name: "math",
		actions: {
			add(ctx) {
				return ctx.result(ctx.params.a + ctx.params.b);
			},

			sub(ctx) {
				return ctx.result(ctx.params.a - ctx.params.b);
			},

			mult(ctx) {
				return ctx.result(ctx.params.a * ctx.params.b);
			},

			div(ctx) {
				if (ctx.params.b != 0)
					return ctx.result(ctx.params.a / ctx.params.b);
				else
					return ctx.error(new Error("Divide by zero!"));
			}
		}
	});
};
