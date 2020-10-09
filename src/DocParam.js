const DocElement = require('./DocElement')

class DocParam extends DocElement {
  constructor (parent, data) {
    super(parent.doc, DocElement.types.PARAM, data, parent)
    this.type = data.type.flat(5)
    this.optional = data.optional
  }

  get formattedName () {
    let name = this.optional ? `\`[${this.name}]\`` : `\`${this.name}\``
    return this.deprecated ? `~~${name}~~` : name
  }

  get url () {
    return null
  }
}

module.exports = DocParam
