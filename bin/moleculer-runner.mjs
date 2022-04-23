#!/usr/bin/env node

/* moleculer
 * Copyright (c) 2021 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

import MoleculerRunner from "../src/runner-esm.mjs";

const runner = new MoleculerRunner();
runner.start(process.argv);
