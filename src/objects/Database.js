const sqlite3 = require("sqlite3")

class Database {
  constructor (path) {
    this.path = path
    this.connection = null
  }

  async connect () {
    this.connection = await (new Promise((resolve, reject) => {
      resolve(new sqlite3.Database(this.path, (error) => error && reject(error)))
    }))
  }

  async createTable (table, columns) {
    return this.execute(`CREATE TABLE ${table} (${columns})`)
  }

  execute (query) {
    return new Promise((resolve, reject) => {
      resolve(this.connection.exec(query, (error) => error && reject(error)))
    })
  }

  prepare (query) {
    return new Promise((resolve, reject) => {
      resolve(this.connection.prepare(query, (error) => error && reject(error)))
    })
  }

  close () {
    if (this.connection) {
      this.connection.close()
    }
  }
}

module.exports = Database
