const { program } = require('commander');

require('./commands/load')(program)

program.parse(process.argv);
