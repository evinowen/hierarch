const config = require("../config")
const fs = require("fs");
const parser = require("csv-parse");
const Database = require("../objects/Database")

class Load {
  async action (source, table) {
    process.stdout.write(`Loading data from ${source} into ${table}\n`);

    let database = new Database(config.DATABASE_PATH)

    await database.connect()

    let initalized = false;
    let statement;

    let stream = fs.createReadStream(source)
      .pipe(parser())
      .on("data", async (row) => {
        stream.pause()

        if (!initalized) {
          process.stdout.write(`Create table ${table} ... `);
          const columns = this.createColumnsFromHeaders(row)

          initalized = await database.execute(`CREATE TABLE ${table} (${headers})`)

          statement = await database.prepare(`INSERT INTO ${table} VALUES (${"? ".repeat(columns.length).trim().split(" ").join(", ")})`)

          process.stdout.write(`complete.\n`);
        } else {
          await (new Promise((resolve, reject) => statement.run(row, (error) => error ? reject(error) : resolve(true))))
        }

        stream.resume()
      })
      .on("end", async () => {
        statement.finalize()

        statement = await database.prepare(`SELECT COUNT(*) count FROM ${table}`)

        let row = await (new Promise((resolve, reject) => statement.get((err, row) => err ? reject(err) : resolve(row))))

        process.stdout.write(` ${row.count} rows loaded into ${table}.\n`);

        statement.finalize()

        database.close();
      });
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
    .action((...args) => (new Load()).action(...args))
}

