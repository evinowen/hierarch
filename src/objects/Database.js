const sqlite3 = require("sqlite3").verbose()

class Database {
  constructor (path) {
    this.path = path
    this.connection = null
  }

  async connect () {
    this.connection = await (new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.path, (error) => error && reject(error))
      resolve(db)
    }))
  }

  async prepare (query) {
    return new Promise((resolve, reject) => {
      let statement = this.connection.prepare(query, (error) => error && reject(error))
      resolve(statement)
    })
  }
}

module.exports = Database
