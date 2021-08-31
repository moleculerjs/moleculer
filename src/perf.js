"use strict";

const _ = require("lodash");
const kleur = require("kleur");

function prefix(indent, max = 10) {
	let prefix = "";
	for (let i = 0; i < Math.min(indent, max); i++) {
		prefix += "  ";
	}
	return prefix;
}

class PerformanceMeter {
	constructor(opts) {
		this.opts = _.defaultsDeep(opts, {});
		// eslint-disable-next-line no-console
		this.logger = this.opts.logger || console.log;
		this.reset();
	}

	reset() {
		this.indent = -1;
		this.store = new Map();
		this.sum = new Map();
		this.count = new Map();
		this.lastName = null;
	}

	start(fnNname) {
		let num = Math.floor(Math.random() * 10000);
		//const name = `${prefix(++this.indent)}${fnNname}`;
		const name = fnNname;
		const id = `${name}-${num}`;
		this.store.set(id, { name, start: process.hrtime() });
		if (!this.sum.has(name)) this.sum.set(name, 0);
		if (!this.count.has(name)) this.count.set(name, 0);
		//this.logger(`PERF: ${name}: START (${num})`);

		return {
			stop: () => this.stop(id)
		};
	}

	stop(id) {
		this.indent--;
		const item = this.store.get(id);
		const diff = process.hrtime(item.start);
		const ms = diff[0] * 1000 + diff[1] / 1000000;
		this.sum.set(item.name, this.sum.get(item.name) + ms);
		this.count.set(item.name, this.count.get(item.name) + 1);
		//this.logger(`${item.name}: END. TIME: ${Math.round(ms)} ms`);
		this.lastName = item.name;
	}

	summary() {
		let total = this.sum.get(this.lastName);
		this.logger("");
		this.logger("");
		this.logger(
			kleur
				.yellow()
				.bold(
					"-----------------------------[ PERF SUMMARY ]----------------------------------"
				)
		);
		Array.from(this.sum.keys()).forEach(key => {
			const value = this.sum.get(key);
			const percent = total > 0 ? Math.round((value * 100) / total) : null;
			const count = this.count.get(key);
			const avg = count > 0 ? Math.round(value / count) : null;
			this.logger(
				`${_.padEnd(`${key} ${kleur.grey("(" + avg + "ms" + ")")}`, 70)}: ${_.padStart(
					Math.round(value),
					6
				)} ms (${_.padStart(percent, 4)}%) x ${count}`
			);
		});
		this.logger(
			kleur
				.yellow()
				.bold(
					"------------------------------------------------------------------------------------"
				)
		);
	}
}

module.exports = new PerformanceMeter();
