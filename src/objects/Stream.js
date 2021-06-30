const fs = require("fs")
const parser = require("csv-parse")

class Stream {
  constructor (source) {
    this.source = source

  }

  async execute () {
    let initalized = false

    let stream = fs.createReadStream(this.source).pipe(parser())

    for await (const row of stream) {
      if (!initalized) {
        await this.callbackCreate(row)
        initalized = true
      } else {
        await this.callbackInsert(row)
      }
    }

    await this.callbackEnd()
  }

  onCreate (callback) {
    this.callbackCreate = callback
  }

  onInsert (callback) {
    this.callbackInsert = callback
  }

  onEnd (callback) {
    this.callbackEnd = callback
  }

}

module.exports = Stream
