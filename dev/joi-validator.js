"use strict";

const ServiceBroker = require("../src/service-broker");
const BaseValidator = require("../src/validator");
const { ValidationError } = require("../src/errors");
const Joi = require("joi");
const SafeJSONSerializer = require("./SafeJsonSerializer");

// --- JOI VALIDATOR CLASS ---
class JoiValidator extends BaseValidator {
	constructor() {
		super();
		this.validator = require("joi");
	}

	compile(schema) {
		return (params) => this.validate(params, schema);
	}

	validate(params, schema) {
		const res = this.validator.validate(params, schema);
		if (res.error)
			throw new ValidationError(res.error.message, null, res.error.details);

		return true;
	}
}

let broker = new ServiceBroker({
	logger: true,
	transporter: "TCP",
	validation: true,
	validator: new JoiValidator,
	serializer: new SafeJSONSerializer()
});

// --- TEST BROKER ---

broker.createService({
	name: "greeter",
	actions: {
		hello: {
			/*params: {
				name: { type: "string", min: 4 }
			},*/
			params: Joi.object().keys({
				name: Joi.string().min(4).max(30).required()
			}),
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
