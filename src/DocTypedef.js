const DocElement = require('./DocElement')
const DocProp = require('./DocProp')

class DocTypedef extends DocElement {
  constructor(doc, data) {
    super(doc, DocElement.types.TYPEDEF, data)
    this.type = data.type.flat(5)
    this.adoptAll(data.props, DocProp)
  }
}

module.exports = DocTypedef
