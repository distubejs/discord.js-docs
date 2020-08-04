const DocElement = require('./DocElement')
const DocParam = require('./DocParam')

class DocEvent extends DocElement {
  constructor (parent, data) {
    super(parent.doc, DocElement.types.EVENT, data, parent)
    this.examples = data.examples || null
    this.adoptAll(data.params, DocParam)
  }

  get formattedName () {
    return `${this.parent.name}#event:${this.name}`
  }
}

module.exports = DocEvent
