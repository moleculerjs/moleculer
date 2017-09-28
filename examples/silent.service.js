module.exports = {
	name: "silent",
	settings: {
		silent: true
	},
	actions: {
		topsecret: {
			protected: true,
			handler() {
				return "Only accessible locally!";
			}
		}
	}
};
