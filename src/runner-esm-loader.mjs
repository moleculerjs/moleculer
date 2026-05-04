/* moleculer
 * Copyright (c) 2025 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

/**
 * ESM loader hooks for Moleculer's hot-reload support.
 *
 * Registered by `runner-esm.mjs` via `module.register()`. Runs on a
 * dedicated loader thread and communicates with the main runner over
 * a `MessagePort`.
 *
 * Responsibilities:
 *   - Track every resolved user file (anything outside `node_modules`)
 *     and the parent → child import relationships seen in `resolve`.
 *     This builds a reverse dependency graph (child → parents) used to
 *     compute transitive importers when a file changes.
 *   - Maintain a per-file "version" counter. When notified of a change,
 *     bump the file AND all its transitive importers, so that the next
 *     `resolve` of any of them returns a fresh `?v=<n>` URL and Node
 *     re-evaluates the whole chain.
 *
 * Protocol (over `MessagePort`):
 *   in:  { type: "invalidate",     path: string,    id: number }
 *        { type: "invalidateAll",                   id: number }
 *        { type: "sync",                            id: number }
 *        { type: "getAllUserFiles",                 id: number }
 *        { type: "getImporters",    path: string,   id: number }
 *   out: { type: "ack", id: number, result?: any }
 *
 * The "sync" message is used by the runner to await delivery: because
 * MessageChannel is FIFO, awaiting an ack for "sync" guarantees that
 * any prior messages have already been processed.
 */

import { fileURLToPath } from "url";
import { sep } from "path";

let port = null;
const versions = new Map();
// child path -> Set<parent path>
const importers = new Map();

export function initialize(data) {
	port = data.port;

	port.on("message", msg => {
		let result;
		switch (msg && msg.type) {
			case "invalidate":
				bumpWithImporters(msg.path);
				break;
			case "invalidateAll":
				for (const k of [...versions.keys()]) bump(k);
				break;
			case "sync":
				// no-op, ack confirms prior messages were processed
				break;
			case "getAllUserFiles":
				result = [...versions.keys()];
				break;
			case "getImporters":
				result = [...collectImporters(msg.path)];
				break;
			default:
				// Unknown message types are still acked so the caller's
				// promise settles.
				break;
		}
		port.postMessage({ type: "ack", id: msg.id, result });
	});
}

function bump(path) {
	versions.set(path, (versions.get(path) || 0) + 1);
}

/**
 * Bump `path` and every file that transitively imports it. This is
 * what enables a single edit (e.g. to a shared helper) to propagate
 * fresh versions all the way up to the service files importing it
 * via several intermediate modules.
 */
function bumpWithImporters(path) {
	bump(path);
	for (const importer of collectImporters(path)) bump(importer);
}

/**
 * Compute the transitive closure of importers for `path` (BFS, cycle-safe).
 * Does NOT include `path` itself.
 */
function collectImporters(path) {
	const out = new Set();
	const queue = [path];
	while (queue.length > 0) {
		const cur = queue.shift();
		const parents = importers.get(cur);
		if (!parents) continue;
		for (const p of parents) {
			if (out.has(p)) continue;
			out.add(p);
			queue.push(p);
		}
	}
	return out;
}

export async function resolve(specifier, context, nextResolve) {
	const result = await nextResolve(specifier, context);
	if (!result || !result.url || !result.url.startsWith("file://")) return result;

	// Strip any incoming query so we look up by the canonical filesystem path.
	const baseUrl = result.url.split("?")[0].split("#")[0];

	let absPath;
	try {
		absPath = fileURLToPath(baseUrl);
	} catch {
		return result;
	}

	// Track every resolved user file (default version 0). We skip
	// `node_modules` to avoid re-importing huge dep trees on every
	// broker restart.
	const isUserFile = !absPath.includes(`${sep}node_modules${sep}`);
	if (isUserFile) {
		if (!versions.has(absPath)) versions.set(absPath, 0);

		// Record parent → child relation (only for user-space imports).
		if (context.parentURL && context.parentURL.startsWith("file://")) {
			const parentBase = context.parentURL.split("?")[0].split("#")[0];
			let parentPath;
			try {
				parentPath = fileURLToPath(parentBase);
			} catch {
				parentPath = null;
			}
			if (
				parentPath &&
				!parentPath.includes(`${sep}node_modules${sep}`) &&
				parentPath !== absPath
			) {
				let set = importers.get(absPath);
				if (!set) {
					set = new Set();
					importers.set(absPath, set);
				}
				set.add(parentPath);
			}
		}
	}

	const v = versions.get(absPath);
	if (v && v > 0) {
		const querySep = result.url.includes("?") ? "&" : "?";
		return {
			...result,
			url: `${result.url}${querySep}v=${v}`,
			shortCircuit: true
		};
	}
	return result;
}
