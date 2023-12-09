import type BaseValidator = require("./base");

import type { ValidatorConstructorOptions } from "fastest-validator";

declare namespace FastestValidator {
	export type ValidatorNames = "Fastest";

	export interface FastestValidatorOptions
		extends ValidatorConstructorOptions,
			BaseValidator.ValidatorOptions {}
}

declare class FastestValidator extends BaseValidator {
	constructor(opts?: FastestValidator.FastestValidatorOptions);

	opts: FastestValidator.FastestValidatorOptions;

	compile(schema: Record<string, any>): BaseValidator.CheckerFunction;
	validate(params: Record<string, any>, schema: Record<string, any>): boolean;
	convertSchemaToMoleculer(schema: any): Record<string, any>;
}
export = FastestValidator;
