const config = require("../config")
const fs = require("fs")
const path = require("path")
const Database = require("../objects/Database")
const Node = require("../objects/Node")

class Generate {
  async action (table, relationships, options) {
    process.stdout.write(`Generating hierarchical map\n`)

    let database = new Database(config.DATABASE_PATH)

    await database.connect()

    const {fields, identifiers, titles} = this.breakoutRelationships(relationships)
    const statement = await this.prepareStatement(database, table, fields, options.filter ?? [])

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
    return statement.each(
      (err, row) => {
        if (err) {
          throw err
        }

        callback(row)
      }
    )
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

  async prepareStatement (database, table, fields, filters) {
    let joins = ''
    let conditions = ''
    const parameters = []

    for (const filter of filters) {
      const [ target, criteria ] = filter.split(':')

      console.log(filter, target, criteria)

      if (criteria.charAt(0) == '=') {
        conditions = joins.concat(`
          WHERE ${table}.${target} = ?
        `)

        parameters.push(criteria.substr(1))
      } else {
        const [ first, second ] = criteria.split('.')

        const criteria_table = second ? first : table
        const criteria_field = second ? second : first

        joins = joins.concat(`
          INNER JOIN ${criteria_table} ON ${table}.${target} = ${criteria_table}.${criteria_field}
        `)
      }
    }

    let query = `
      SELECT ${fields.join(", ")}
      FROM ${table}
      ${joins}
      ${conditions}
      GROUP BY ${fields.join(", ")}
      ORDER BY ${fields.join(", ")}
    `

    let statement = await database.prepare(query)
    await statement.bind(...parameters)

    return statement
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
    .option('-f, --filter <filters...>', 'Filter a column values with another column')
    .action((...args) => (new Generate()).action(...args))
}
