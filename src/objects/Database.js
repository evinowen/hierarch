const sqlite3 = require('sqlite3').verbose()
const { open } = require('sqlite')

class Database {
  constructor (path) {
    this.path = path
    this.connection = null
  }

  async connect () {
    this.connection = await open({
      filename: this.path,
      driver: sqlite3.Database
    })
  }

  createTable (table, columns) {
    return this.execute(`CREATE TABLE ${table} (${columns.join(', ')})`)
  }

  async countTable (table) {
    const statement = await this.prepare(`SELECT COUNT(*) count FROM ${table}`)

    let result = await statement.get()
    statement.finalize()

    return result.count
  }

  prepareTableInsert (table, columns) {
    return this.prepare(`INSERT INTO ${table} VALUES (${"? ".repeat(columns.length).trim().split(" ").join(", ")})`)
  }

  execute (query) {
    return this.connection.exec(query)
  }

  prepare (query) {
    return this.connection.prepare(query)
  }

  close () {
    if (this.connection) {
      this.connection.close()
    }
  }
}

module.exports = Database
