import fetch from "node-fetch";

/**
 * Test:
 *
 * 	npx ts-node -T bin\moleculer-runner.js -c examples\runner\moleculer.config.async.ts -r examples/user.service.js
 */
export default async function () {
	const res = await fetch("https://pastebin.com/raw/SLZRqfHX");
	return await res.json();
}
