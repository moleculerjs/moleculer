module.exports = {
	name: "math",
	actions: {
		add(ctx) {
			return ctx.params.a + ctx.params.b;
		},

		sub(ctx) {
			return ctx.params.a - ctx.params.b;
		},

		mult(ctx) {
			return ctx.params.a * ctx.params.b;
		},

		div(ctx) {
			if (ctx.params.b != 0)
				return ctx.params.a / ctx.params.b;
			else
				throw new Error("Divide by zero!");
		}
	}
};
