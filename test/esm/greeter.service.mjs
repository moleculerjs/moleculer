export default {
	name: "greeter",

	actions: {
		hello: {
			async handler() {
				return "Hello Moleculer";
			}
		},

		welcome: {
			params: {
				name: "string|no-empty"
			},
			async handler(ctx) {
				const name = await ctx.call("helper.uppercase", ctx.params.name);
				return `Welcome, ${name}!`;
			}
		}
	}
};
