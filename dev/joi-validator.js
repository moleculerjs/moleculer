/* eslint-disable no-console */

"use strict";

let ServiceBroker = require("../src/service-broker");
let BaseValidator = require("../src/validator");
let Joi = require("joi");
let { ValidationError } = require("../src/errors");

class JoiValidator extends BaseValidator {

}

let broker = new ServiceBroker({
	logger: true,
	validation: true,
	validator: new JoiValidator
});

broker.createService({
	name: "greeter",
	actions: {
		hello: {
			params: {
				name: { type: "string", min: 4 }
			},
			handler(ctx) {
				return `Hello ${ctx.params.name}`;
			}
		}
	}
});

broker.start()
	.then(() => broker.call("greeter.hello").then(res => broker.logger.info(res)))
	.catch(err => broker.logger.error(err.message, err.data))
	.then(() => broker.call("greeter.hello", { name: 100 }).then(res => broker.logger.info(res)))
	.catch(err => broker.logger.error(err.message, err.data))
	.then(() => broker.call("greeter.hello", { name: "Joe" }).then(res => broker.logger.info(res)))
	.catch(err => broker.logger.error(err.message, err.data))
	.then(() => broker.call("greeter.hello", { name: "John" }).then(res => broker.logger.info(res)))
	.catch(err => broker.logger.error(err.message, err.data));
