const config = require("../config")
const Database = require("../objects/Database")
const Stream = require("../objects/Stream")

class Load {
  async action (source, table) {
    process.stdout.write(`Loading data from ${source} into ${table}\n`);

    let database = new Database(config.DATABASE_PATH)

    await database.connect()

    let statement;

    const stream = new Stream(source)

    stream.onCreate(async (row) => {
      const columns = this.createColumnsFromHeaders(row)

      await database.createTable(table, columns)

      statement = await database.prepareTableInsert(table, columns)
    })

    stream.onInsert(async (row) => {
      await statement.run(row)
    })

    stream.onEnd(async () => {
      statement.finalize()

      statement = await database.prepare(`SELECT COUNT(*) count FROM ${table}`)

      let row = await statement.get()
      process.stdout.write(` ${row.count} rows loaded into ${table}.\n`);

      statement.finalize()
      database.close();
    })

    await stream.execute()
  }

  createColumnsFromHeaders (headers) {
    return headers.map(header => {
      return header
        .replaceAll(/[^A-Za-z0-9]/g, "_")
        .replace(/^[^A-Za-z0-9]/, "_")
    })
  }
}

module.exports = (program) => {
  program.command("load <source> <table>")
    .description("Load a dataset into the database")
    .action(async (...args) => await (new Load()).action(...args))
}

