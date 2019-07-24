const _ = require("lodash");
const kleur = require("kleur");
const { MoleculerRetryableError } = require("../../src/errors");

const SERVICES = ["add", "sub", "mult", "div"];
const randomService = () => SERVICES[_.random(SERVICES.length - 1)];

let count = 0;

module.exports = {
	actions: {
		calc: {
			cache: {
				keys: ["a", "b"],
				ttl: 600
			},
			//fallback: (ctx, err) => ({ count: ctx.params.count, res: 999, fake: true }),
			//fallback: "fakeResult",
			handler(ctx) {
				const wait = _.random(this.settings.waitMin, this.settings.waitMax);
				const msg = _.padEnd(`${kleur.grey(ctx.requestID)}: ${Number(ctx.params.a).toFixed(0)} + ${Number(ctx.params.b).toFixed(0)}`, 40);
				if (_.random(100) < 100 * this.settings.changeToThrowError) {
					this.logger.warn(msg, kleur.red().bold("ERROR!"));
					return this.Promise.reject(new MoleculerRetryableError("Random error!", 510, "RANDOM_ERROR"));
				}

				return this.Promise.resolve().delay(wait).then(() => {
					this.logger.info(msg, kleur.green().bold("OK"), kleur.grey(`(L${ctx.level}, W: ${_.padStart(wait, 4)} ms)`));
					const res = this.logic(ctx);

					if (_.random(100) < 100 * this.settings.chanceToCallOtherService) {

						const payload = { a: res, b: _.random(1, 100) };
						const svc = randomService() + ".calc";
						const msg = `${count}. Call '${svc}' with ${payload.a} + ${payload.b}:`;
						const p = ctx.call(svc, payload, { meta: { count } });
						return p.then(res => {
							//this.logger.info(_.padEnd(msg, 35), kleur.green().bold("OK")/*, kleur.grey(`(${p.ctx.duration} ms)`)*/);
							return res;
						}).catch(err => {
							//this.logger.info(_.padEnd(msg, 35), kleur.red().bold(`ERROR! ${err.message}`));
							throw err;
						});
					} else {
						return {
							res
						};
					}
				});
			}
		},
	}
};
