let _ = require("lodash");
let Promise	= require("bluebird");
let fs = require("fs");
let path = require("path");

let chalk = require("chalk");
let Benchmark = require("benchmark");

class Benchmarker {
	constructor(opts) {
		this.opts = _.defaultsDeep(opts, {
			async: false,
			name: ""
		});
		this.suite = new Benchmark.Suite;
		this.logger = this.opts.logger || console;
		this.async = this.opts.async;
	}

	getDataFile(filename, encoding = "utf8") {
		return fs.readFileSync(path.join(__dirname, "data", filename), encoding);
	}

	add(name, fn) {
		if (this.async) {
			this.suite.add(name, {
				defer: true,
				fn(deferred) {
					return fn().then(() => deferred.resolve());
				}
			});
		} else {
			this.suite.add(name, fn);
		}
	}

	skip() {
		return Promise.resolve();
	}

	run() {
		let self = this;
		return new Promise((resolve, reject) => {
			this.suite.on("cycle", function(event) {
				let bench = event.target;
				if (bench.error)
					self.logger.error(chalk.red.bold(String(bench), bench.error.message, "\n", bench.error.stack || ""));
				else
					self.logger.log("››", String(bench));
			})
			.on("complete", function() {
				self.logger.log("");
				let tests = this.filter("successful");
				let maxTitle = tests.reduce((a, b) => a.name.length > b.name.length ? a : b).name;				
				let fastest = this.filter("fastest")[0];
				let pe = _.padEnd;
				let ps = _.padStart;

				tests.forEach(bench => {
					const c = bench == fastest ? chalk.green : chalk.cyan;
					let diff = ((bench.hz / fastest.hz) * 100) - 100;
					let line = [
						"  ", 
						pe(bench.name, maxTitle.length + 1), 
						ps(Number(diff).toFixed(2) + "%", 8), 
						ps("  (" + Benchmark.formatNumber(bench.hz.toFixed(0)) + " ops/sec)", 20)
					];
					self.logger.log(c.bold(...line));
				});
				self.logger.log("-----------------------------------------------------------------------\n");

				resolve();
			});

			this.logger.log(chalk.magenta.bold("Suite:", this.opts.name));

			this.suite.run({
				defer: this.async,
				async: this.async
			});
			
		});
	}

	static printHeader(name, logger) {
		logger = logger || console;

		let title = "  " + name + "  ";
		let lines = "=".repeat(title.length);
		logger.log(chalk.yellow.bold(lines));
		logger.log(chalk.yellow.bold(title));
		logger.log(chalk.yellow.bold(lines));
		logger.log("");	

		require("./platform")(logger);
		logger.log("");	
	}
}

module.exports = Benchmarker;