"use strict";

const moduleName = process.argv[2] || "simple";
process.argv.splice(2, 1);

require("./" + moduleName);