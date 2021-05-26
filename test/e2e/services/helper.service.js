module.exports = {
	name: "$helper",

	events: {
		async "$shutdown"(ctx) {
			this.logger.info("Shutting down node...", ctx.params);
			await Promise.delay(1000);
			process.exit(ctx.params.error ? 2 : 0);
		}
	}
};
