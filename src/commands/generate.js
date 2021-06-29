const config = require("../config")
const fs = require("fs")
const path = require("path")
const Database = require("../objects/Database")
const Node = require("../objects/Node")

class Generate {
  async action (table, relationships) {
    process.stdout.write(`Generating hierarchical map\n`)

    let database = new Database(config.DATABASE_PATH)

    await database.connect()

    const {fields, identifiers, titles} = this.breakoutRelationships(relationships)
    const query = this.prepareQuery(table, fields)

    const statement = await database.prepare(query)

    let root = new Node()
    let node = root

    let state = []

    await this.iterateStatement(statement, (row) => {
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
    })

    statement.finalize()

    database.close()

    const file = await this.outputDocument(root)

    console.log(`Render complete at ${file}`)
  }

  iterateStatement (statement, callback) {
    return new Promise((resolve, reject) => statement.each(
      (err, row) => {
        if (err) {
          reject(err)
        }

        callback(row)
      },
      (err, _) => err ? reject(err) : resolve()
    ))
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

  prepareQuery (table, fields) {
    return `
      SELECT ${fields.join(", ")}
      FROM ${table}
      GROUP BY ${fields.join(", ")}
      ORDER BY ${fields.join(", ")}
    `
  }

  outputDocument (root) {
    const html = root.print()
    const render = path.resolve(config.RENDER_PATH)

    return new Promise((resolve, reject) => fs.writeFile(render, html, (err) => err ? reject(err) : resolve(render)))
  }
}

module.exports = (program) => {
  program.command("generate <table> <relationships...>")
    .description("Generate hierarchical map of data based on relationships")
    .action((...args) => (new Generate()).action(...args))
}
