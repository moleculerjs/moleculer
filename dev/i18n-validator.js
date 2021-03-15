"use strict";

const _ = require("lodash");
const ServiceBroker = require("../src/service-broker");
const BaseValidator = require("../src/validator");
const Validator = require("fastest-validator");
const DefaultMessages = require("fastest-validator/lib/messages");
const { ValidationError } = require("../src/errors");

// --- I18N VALIDATOR CLASS ---
class I18NValidator extends BaseValidator {
	constructor(messages) {
		super();
		0;
		this.validators = {};
		Object.keys(messages).forEach(lang => {
			this.validators[lang] = new Validator();
			this.validators[lang].messages = Object.assign({}, DefaultMessages, messages[lang]);
		});
	}

	compile(schema) {
		this.checks = {};
		Object.keys(this.validators).forEach(lang => {
			this.checks[lang] = this.validators[lang].compile(schema);
		});
		return this.checks;
	}

	middleware() {
		return function I18NValidator(handler, action) {
			// Wrap a param validator
			if (action.params && typeof action.params === "object") {
				const checks = this.compile(action.params);
				return function validateContextParams(ctx) {
					const check = checks[ctx.meta.lang] || checks["en"];
					const res = check(ctx.params);
					if (res === true)
						return handler(ctx);
					else
						return Promise.reject(new ValidationError("Parameters validation error!", null, res));
				};
			}
			return handler;
		}.bind(this);
	}
}

let broker = new ServiceBroker({
	logger: true,
	validator: new I18NValidator({
		"en": {
			"string": "The '{field}' field must be a string!"
		},
		"hu": {
			"string": "A '{field}' mezőnek szövegnek kell lennie!"
		}
	})
});

// --- TEST BROKER ---

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
	// No meta lang
	.then(() => broker.call("greeter.hello", { name: 100 }).then(res => broker.logger.info(res)))
	.catch(err => broker.logger.error(err.message, err.data))
	// "hu" lang
	.then(() => broker.call("greeter.hello", { name: 100 }, { meta: { lang: "hu" }}).then(res => broker.logger.info(res)))
	.catch(err => broker.logger.error(err.message, err.data))
	// "en" lang
	.then(() => broker.call("greeter.hello", { name: 100 }, { meta: { lang: "en" }}).then(res => broker.logger.info(res)))
	.catch(err => broker.logger.error(err.message, err.data));
