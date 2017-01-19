module.exports = {
	name: "math",
	actions: {
		add(ctx) {
			return Number(ctx.params.a) + Number(ctx.params.b);
		},

		sub(ctx) {
			return Number(ctx.params.a) - Number(ctx.params.b);
		},

		mult: {
			params: {
				a: "required|numeric",
				b: "required|numeric"
			},
			handler(ctx) {
				return Number(ctx.params.a) * Number(ctx.params.b);
			}
		},

		div(ctx) {
			let a = Number(ctx.params.a);
			let b = Number(ctx.params.b);
			if (b != 0)
				return a / b;
			else
				throw new Error("Divide by zero!");
		}
	}
};
