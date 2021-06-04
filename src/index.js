const { program } = require("commander");

require("./commands/load")(program)
require("./commands/generate")(program)

program.parse(process.argv);
