import { describe } from "./B.mjs";

export function tell() {
	return `C wraps: [${describe()}]`;
}
