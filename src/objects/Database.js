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
