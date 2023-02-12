export { default as Base, type ValidatorNames } from "./base";
export { default as Fastest } from "./fastest";

import BaseValidator = require("./base");
import type { ValidatorNames } from "./base";
import FastestValidator = require("./fastest");

export { BaseValidator, FastestValidator, ValidatorNames };
