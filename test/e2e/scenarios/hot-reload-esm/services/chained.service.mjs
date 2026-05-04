import { tell } from "./chain/C.mjs";

export default {
	name: "chained",

	actions: {
		say() {
			return tell();
		}
	}
};
