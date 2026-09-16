import { GREETING } from "./shared.mjs";

export default {
	name: "greeter",

	actions: {
		hello() {
			return GREETING;
		}
	}
};
