import Validator = require("./base");
import type { ValidatorNames, ValidatorOptions } from "./base";
import FastestValidator = require("./fastest");

export { Validator as Base, FastestValidator as Fastest, ValidatorNames, ValidatorOptions };

export declare function resolve(opt: Record<string,any>|string): Validator;
export declare function register(name: string, value: Validator): void;
