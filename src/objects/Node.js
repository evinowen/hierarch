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
        <div style="margin-top: -20px">
          <div style="float: left; border-bottom: 6px solid black; height: 20px; margin-bottom: -20px; width: 240px; padding: ${padding};">
            <div style="height: 40px;">
              <div style="padding: 10px; border: 6px solid black; background: #222; height: 100%; text-align: center;">
                <strong>${this.title}</strong>
              </div>
            </div>
          </div>
          <div style="float: left; border-left: 6px solid black; min-height: 5px; margin-top: 20px">
            ${content}
          </div>
        </div>

      `

      if (![Node.States.ONLY, Node.States.LAST].includes(state)) {

        if (!depth) {
          content += `
            <div style="height: 80px; clear: both;">
            </div>
            <div style="border: 1px dotted black; margin: auto"></div>
            <div style="height: 80px; clear: both;">
            </div>

          `
        } else {
          content += `
            <div style="height: 80px; clear: both;"></div>
          `
        }
      }
    } else {
      content = `
        <html>
          <head>
            <title>hierarch render</title>
            <link rel="preconnect" href="https://fonts.gstatic.com">
            <link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">
          </head>
          <body style="background: #444; color: white; font-family: 'Roboto', sans-serif; font-size: 1.2em;">
            <div style="margin: 40px 0">
              ${content}
            </div>
          </body>
        </html>
      `
    }

    return content
  }
}

Node.States = {
  ONLY: 1,
  FIRST: 2,
  LAST: 3
}

module.exports = Node
