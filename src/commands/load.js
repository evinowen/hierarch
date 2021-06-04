const config = require("../config")
const fs = require("fs");
const parser = require("csv-parse");
const sqlite3 = require("sqlite3").verbose();

module.exports = (program) => {
  program.command("load <source> <table>")
    .description("Load a dataset into the database")
    .action((source, table) => {
      console.log(source);
      let db = new sqlite3.Database(config.DATABASE_PATH, (err) => {
        if (err) {
          console.error("ERROR ERROR ERROR: ", err.message);
        }
      });

      let initalized = false;
      let statement;
      let parameters;

      let stream = fs.createReadStream(source)
        .pipe(parser())
        .on("data", async (row) => {
          stream.pause()

          if (!initalized) {
            process.stdout.write(`Create table ${table} ... `);
            let headers = row.map(column => {
              return column
                .replaceAll(/[^A-Za-z0-9]/g, "_")
                .replace(/^[^A-Za-z0-9]/, "_")
            })

            parameters = "? ".repeat(headers.length).trim().split(" ").join(", ")

            initalized = await (new Promise((resolve, reject) => db.exec(`CREATE TABLE ${table} (${headers})`, (error) => error ? reject(error) : resolve(true))))

            statement = await (new Promise((resolve, reject) => {
              let statement = db.prepare(
                `INSERT INTO ${table} VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                (error) => error ? reject(error) : resolve(statement))
            }))

            process.stdout.write(`complete.\n`);
          } else {
            await (new Promise((resolve, reject) => statement.run(row, (error) => error ? reject(error) : resolve(true))))
          }

          stream.resume()
        })
        .on("end", async () => {
          statement.finalize()

          statement = await (new Promise((resolve, reject) => { let statement = db.prepare(`SELECT COUNT(*) count FROM ${table}`, (err) => err ? reject(err) : resolve(statement))} ))

          let row = await (new Promise((resolve, reject) => statement.get((err, row) => err ? reject(err) : resolve(row))))

          process.stdout.write(` ${row.count} rows loaded into ${table}.\n`);

          statement.finalize()

          db.close();
        });
    });
}

