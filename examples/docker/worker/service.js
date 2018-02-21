"use strict";

module.exports = {
	name: "worker",

	actions: {

		fibo: {
			params: {
				n: { type: "number", positive: true },
			},
			handler(ctx) {
				let num = Number(ctx.params.n);
				let a = 1, b = 0, temp;

				while (num >= 0) {
					temp = a;
					a = a + b;
					b = temp;
					num--;
				}

				return b;
			}
		}
	}
};
