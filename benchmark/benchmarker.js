let _ = require("lodash");
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
		return fs.readFileSync(__dirname + "/data/" + filename, encoding);
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
				self.logger.log(chalk.yellow.bold("\n-----[ Result ]----"));
				self.logger.log(chalk.green.bold("  Fastest: " + this.filter("fastest").map("name").join(", ")));
				self.logger.log("\n");
				//self.logger.log(chalk.red("  Slowest: " + this.filter("slowest").map("name").join(", ")));

				resolve();
			});

			this.logger.log(chalk.magenta.bold("Suite:", this.opts.name));

			this.suite.run({
				defer: this.async,
				async: this.async
			});
			
		});
	}
}

module.exports = Benchmarker;