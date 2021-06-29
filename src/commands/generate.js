const config = require("../config")
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const Node = require("../objects/Node")

class Generate {
  async action (table, relationships) {
    process.stdout.write(`Generating hierarchical map\n`);

    let db = await this.connectDatabase()

    const {fields, identifiers, titles} = this.breakoutRelationships(relationships)

    const statement = await this.prepareStatement(db, table, fields)

    let root = new Node(null, "ROOT NODE")
    let node = root

    let state = []
    let rows = await (new Promise((resolve, reject) => statement.each(
      (err, row) => {
        if (err) {
          reject(err)
        }

        for (let index = state.length - 1; index >= 0; index--) {
          if (state[index] != row[identifiers[index]]) {
            node = node.parent
            state.pop()
          }
        }

        while (state.length < identifiers.length - 1) {
          node = node.add(row[titles[state.length]], row[identifiers[state.length]])
          state.push(row[identifiers[state.length]])
        }

        node.add(row[titles[state.length]], row[identifiers[state.length]])
      },
      (err, rows) => err ? reject(err) : resolve(rows)
    )))

    statement.finalize()

    db.close()

    let html = root.print()
    let render = path.resolve(config.RENDER_PATH)
    await (new Promise((resolve, reject) => fs.writeFile(render, html, (err) => err ? reject(err) : resolve(true))))

    console.log(`Render complete at ${render}`)
  }

  async connectDatabase () {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(config.DATABASE_PATH, (error) => error ? reject(error) : resolve(db))
    })
  }

  breakoutRelationships (relationships) {
    const fields = []
    const identifiers = []
    const titles = []

    for (const relationship of relationships) {
      const parsed = relationship.split(":")

      if (parsed.length > 1) {
        titles.push(parsed[0])
        fields.push(parsed[0])

        identifiers.push(parsed[1])
        fields.push(parsed[1])
      } else {
        titles.push(parsed[0])
        identifiers.push(parsed[0])
        fields.push(parsed[0])
      }

    }

    return { fields, identifiers, titles }
  }

  async prepareStatement (db, table, fields) {
    let query = `
      SELECT ${fields.join(", ")}
      FROM ${table}
      GROUP BY ${fields.join(", ")}
      ORDER BY ${fields.join(", ")}
    `

    return new Promise((resolve, reject) => {
      let statement = db.prepare(query, (error) => error ? reject(error) : resolve(statement))
    })
  }
}

module.exports = (program) => {
  program.command("generate <table> <relationships...>")
    .description("Generate hierarchical map of data based on relationships")
    .action((...args) => (new Generate()).action(...args));
}
