"use strict";

const _ = require("lodash");
const kleur = require("kleur");
const ServiceBroker = require("../src/service-broker");
const { MoleculerError } = require("../src/errors");

// --- SAGA MIDDLEWARE ---
const SagaMiddleware = function() {
	return {
		localAction(handler, action) {
			if (action.saga) {
				const opts = action.saga;
				return function sagaHandler(ctx) {
					return handler(ctx)
						.then(res => {
							if (opts.compensation) {
								if (!ctx.meta.$saga) {
									ctx.meta.$saga = {
										compensations: []
									};
								}

								const comp = {
									action: opts.compensation.action
								};
								if (opts.compensation.params) {
									comp.params = opts.compensation.params.reduce((a, b) => {
										_.set(a, b, _.get(res, b));
										return a;
									}, {});
								}
								ctx.meta.$saga.compensations.unshift(comp);
							}
							return res;
						})
						.catch(err => {
							if (action.saga === true) {
								// Start compensating
								ctx.service.logger.warn(kleur.red().bold("Some error occured. Start compensating..."));
								ctx.service.logger.info(ctx.meta.$saga.compensations);
								if (ctx.meta.$saga && Array.isArray(ctx.meta.$saga.compensations)) {
									return Promise.mapSeries(ctx.meta.$saga.compensations, item => {
										return ctx.call(item.action, item.params);
									}).then(() => {
										throw err;
									});
								}
							}

							throw err;
						});
				};
			}

			return handler;
		}
	};
};

// --- BROKER ---
const broker = new ServiceBroker({
	logFormatter: "short",
	middlewares: [
		SagaMiddleware()
	]
});

// --- CARS SERVICE ---
broker.createService({
	name: "cars",
	actions: {
		reserve: {
			saga: {
				compensation: {
					action: "cars.cancel",
					params: ["id"]
				}
			},
			handler(ctx) {
				this.logger.info(kleur.cyan().bold("Car is reserved."));
				return {
					id: 5,
					name: "Honda Civic"
				};
			}
		},

		cancel: {
			handler(ctx) {
				this.logger.info(kleur.yellow().bold(`Cancel car reservation of ID: ${ctx.params.id}`));
			}
		}
	}
});

// --- HOTELS SERVICE ---
broker.createService({
	name: "hotels",
	actions: {
		book: {
			saga: {
				compensation: {
					action: "hotels.cancel",
					params: ["id"]
				}
			},
			handler(ctx) {
				this.logger.info(kleur.cyan().bold("Hotel is booked."));
				return {
					id: 8,
					name: "Holiday Inn",
					from: "2019-08-10",
					to: "2019-08-18"
				};
			}
		},

		cancel: {
			handler(ctx) {
				this.logger.info(kleur.yellow().bold(`Cancel hotel reservation of ID: ${ctx.params.id}`));
			}
		}
	}
});

// --- FLIGHTS SERVICE ---
broker.createService({
	name: "flights",
	actions: {
		book: {
			saga: {
				compensation: {
					action: "flights.cancel",
					params: ["id"]
				}
			},
			handler(ctx) {
				return this.Promise.reject(new MoleculerError("Unable to book flight!"));

				this.logger.info(kleur.cyan().bold("Flight is booked."));
				return {
					id: 2,
					number: "SQ318",
					from: "SIN",
					to: "LHR"
				};
			}
		},

		cancel: {
			handler(ctx) {
				this.logger.info(kleur.yellow().bold(`Cancel flight ticket of ID: ${ctx.params.id}`));
			}
		}
	}
});

// --- TRIP SAGA SERVICE ---
broker.createService({
	name: "trip-saga",
	actions: {
		createTrip: {
			saga: true,
			async handler(ctx) {
				try {
					const car = await ctx.call("cars.reserve");
					const hotel = await ctx.call("hotels.book");
					const flight = await ctx.call("flights.book");
					this.logger.info(kleur.green().bold("Trip is created successfully: "), { car, flight, hotel });
				} catch(err) {
					this.logger.error(kleur.red().bold("Trip couldn't be created. Reason: "), err.message);
					throw err;
				}
			}
		}
	}
});

// --- START ---
async function start() {
	await broker.start();

	//broker.repl();

	await broker.call("trip-saga.createTrip");
}

start();
