module.exports = {
	name: "helper",
	actions: {
		uppercase: {
			handler(ctx) {
				return ctx.params.toUpperCase();
			}
		}
	}
};
