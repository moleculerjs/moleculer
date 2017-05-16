"use strict";

const moduleName = process.argv[2];
process.argv.splice(2, 1);

require("./" + (moduleName || "dev"));