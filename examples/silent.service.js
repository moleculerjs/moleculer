module.exports = {
	name: "silent",
	settings: {
		silent: true
	},
	actions: {
		topsecret: {
			protected: true,
			handler(ctx) {
				return "Only accessible locally!";
			}
		}
	}
};
