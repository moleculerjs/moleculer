"use strict";

module.exports = {
	name: "math",
	actions: {
		add(ctx) {
			return Number(ctx.params.a) + Number(ctx.params.b);
		},

		sub(ctx) {
			return Number(ctx.params.a) - Number(ctx.params.b);
		}
	}
};
