#!/usr/bin/env node

/* moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { Runner } = require("../");

const runner = new Runner();
runner.start(process.argv);
