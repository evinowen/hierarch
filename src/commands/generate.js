const config = require("../config")
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

class Node {
  constructor (parent = null, title = null, value = null) {
    this.parent = parent
    this.title = title
    this.value = value
    this.members = []
  }

  add (title, value) {
    let node = new Node(this, title, value)
    this.members.push(node)
    return node
  }

  state (index) {
    console.log(`CHECK STATE FOR ${index}/${this.members.length}`, Node.States)

    if (index == 0) {
      return this.members.length == 1 ? Node.States.ONLY : Node.States.FIRST
    }

    if (index == this.members.length - 1) {
      return Node.States.LAST
    }

    return 0
  }

  print (depth = 0, state = 0) {
    let content = ""

    for (let index in this.members) {
      content += this.members[index].print(this.parent ? depth + 1 : depth, this.state(index))
    }

    if (this.parent) {
      let pad_right = "20px"
      let pad_left = "20px"

      if (depth == 0) {
        pad_left = "0"
      }

      if (this.members.length < 1) {
        pad_right = "0"
      }

      let padding = `0 ${pad_right} 0 ${pad_left}`

      content = `
        <div>
          <div style="float: left; border-bottom: 1px solid black; height: 20px; margin-bottom: -20px; padding: ${padding};">
            <div style="height: 40px;">
              <div style="border: 1px solid black; background: white; height: 100%;">
                <strong>${this.title}</strong>
              </div>
            </div>
          </div>
          <div style="float: left; border-left: 1px solid black; margin-top: 20px">
            ${content}
          </div>
        </div>

      `

      if (![Node.States.ONLY, Node.States.LAST].includes(state)) {
        content += `
          <div style="height: 40px; clear: both;"></div>
        `
      }
    }

    return content
  }
}

Node.States = {
  ONLY: 1,
  FIRST: 2,
  LAST: 3
}

module.exports = (program) => {
  program.command("generate <table> <relationships...>")
    .description("Generate hierarchical map of data based on relationships")
    .action(async (table, relationships) => {
      process.stdout.write(`Generating hierarchical map\n`);

      let db = await (new Promise((resolve, reject) => {
        let db = new sqlite3.Database(config.DATABASE_PATH, (error) => error ? reject(error) : resolve(db))
      }))

      let fields = []
      let identifiers = []
      let titles = []
      for (let relationship of relationships) {
        let parsed = relationship.split(":")

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

      let query = `
        SELECT ${fields.join(", ")}
        FROM ${table}
        GROUP BY ${fields.join(", ")}
        ORDER BY ${fields.join(", ")}
      `

      console.log(query)

      let statement = await (new Promise((resolve, reject) => {
        let statement = db.prepare(query, (error) => error ? reject(error) : resolve(statement))
      }))

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
    });
}
