const DocBase = require('./DocBase')
const { stripIndents } = require('common-tags')

const DESCRIPTION_LIMIT = 1000

class DocElement extends DocBase {
  constructor(doc, docType, data, parent) {
    super(data)
    this.doc = doc
    this.docType = docType
    this.parent = parent || null

    this.name = data.name
    this.description = data.description
    this.meta = data.meta

    this.returns = null
    this.examples = null
    this.type = null
    this.nullable = null

    this.deprecated = data.deprecated || false
    this.access = data.access || 'public'
  }

  get url() {
    if (!this.doc.baseDocsURL) return null

    let path;
    if (this.doc.repo === "DisTube") path = this.parent
      ? this.parent.docType === DocBase.types.TYPEDEF ? `global#${this.parent.name}`
        : `${this.parent.name}#${this.static ? '.' : this.docType === DocBase.types.EVENT ? "event:" : ''}${this.name}`
      : `${this.docType === DocBase.types.TYPEDEF ? "global#" : ""}${this.name}`
    else path = this.parent
      ? `${this.parent.docType}/${this.parent.name}?scrollTo=${this.static ? 's-' : ''}${this.name}`
      : `${this.docType}/${this.name}`

    return `${this.doc.baseDocsURL}/${path}`
  }

  get sourceURL() {
    if (!this.doc.repoURL || !this.meta) return null

    const { path, file, line } = this.meta
    return `${this.doc.repoURL}/${path}/${file}#L${line}`
  }

  get formattedName() {
    return this.name
  }

  get formattedDescription() {
    let result = this.formatText(this.description)

    if (result.length > DESCRIPTION_LIMIT) {
      result = result.slice(0, DESCRIPTION_LIMIT) +
        `...\nDescription truncated. View full description [here](${this.url}).`
    }

    return result
  }

  get formattedReturn() {
    return this.formatText(this.returns)
  }

  get formattedType() {
    return `${this.nullable ? '?' : ''}${this.doc.formatType(this.type)}`
  }

  get formattedExtends() {
    return `(extends ${this.formatInherits(this.extends)})`
  }

  get formattedImplements() {
    return `(implements ${this.formatInherits(this.implements)})`
  }

  get link() {
    return `[${this.formattedName}](${this.url})`
  }

  get static() {
    return this.scope === 'static'
  }

  get typeElement() {
    if (!this.type) return null

    return this.type
      .filter(text => /^\w+$/.test(text))
      .map(text => this.doc.findChild(text.toLowerCase()))
      .find(elem => elem)
  }

  embed(options = {}) {
    const embed = this.doc.baseEmbed()
    let name = `__**${this.link}**__`

    if (this.extends) name += ` ${this.formattedExtends}`
    if (this.implements) name += ` ${this.formattedImplements}`
    if (this.access === 'private') name += ' **PRIVATE**'
    if (this.deprecated) name += ' **DEPRECATED**'

    embed.description = `${name}\n${this.formattedDescription}`
    embed.url = this.url
    embed.fields = []
    this.formatEmbed(embed, options)
    if (this.sourceURL)
      embed.fields.push({
        name: '\u200b',
        value: `[View source](${this.sourceURL})`
      })

    return embed
  }

  formatEmbed(embed, options = {}) {
    this.attachConstructor(embed)
    this.attachProps(embed, options)
    this.attachMethods(embed, options)
    this.attachEvents(embed)
    this.attachParams(embed)
    this.attachType(embed)
    this.attachReturn(embed)
    this.attachExamples(embed)
  }

  attachConstructor(embed) {
    if (!this.construct || (!this.construct.params && !this.construct.examples)) return;
    const formatDescription = (description) => {
      let result = this.formatText(description)
      if (result.length > DESCRIPTION_LIMIT) {
        result = result.slice(0, DESCRIPTION_LIMIT) +
          `...\nDescription truncated. Click header link above to read full description.`
      }
      return result
    }

    embed.fields.push({
      name: 'Constructor',
      value: `${formatDescription(this.construct.description)}\n\`\`\`js\nnew ${this.doc.repo === "DisTube" ? "" : `Discord.`}${this.construct.name}(${this.construct.params ? this.construct.params.map(p => p.optional ? `[${p.name}]` : p.name).join(", ") : ""})\`\`\``
    })

    if (this.construct.params) {
      const params = this.construct.params.map(param => {
        return stripIndents`
          \`${param.optional ? `[${param.name}]` : param.name}\` ${param.nullable ? '?' : ''}${this.doc.formatType(param.type.flat(5))}
          ${formatDescription(param.description)}
        `
      })
      const shift = params.shift()
      embed.fields.push({ name: 'Params', value: shift, inline: true })

      while (params.length > 0) {
        const shift = params.shift()
        embed.fields.push({ name: '\u200b', value: shift, inline: true })
      }
      let count = (3 - embed.fields.slice(embed.fields.map(v => !!v.inline).lastIndexOf(false) + 1).length % 3) % 3
      while (count--)
        embed.fields.push({ name: '\u200b', value: '\u200b', inline: true })
    }

    if (this.construct.examples) {
      embed.fields.push({
        name: 'Examples',
        value: this.construct.examples.map(ex => `\`\`\`js\n${ex}\n\`\`\``).join('\n')
      })
    }
  }

  attachProps(embed, { excludePrivateElements } = {}) {
    if (!this.props) return

    let props = this.props
    if (excludePrivateElements) props = props.filter(prop => prop.access !== 'private')
    if (props.length === 0) return

    if (!this.methods && !this.events) {
      props = props.map(prop => {
        return stripIndents`
          ${prop.embedName} ${prop.formattedType}
          ${prop.formattedDescription}
        `
      })

      const shift = props.shift();
      embed.fields.push({ name: 'Properties', value: shift, inline: true })

      while (props.length > 0) {
        const shift = props.shift()
        embed.fields.push({ name: '\u200b', value: shift, inline: true })
      }
      let count = (3 - embed.fields.slice(embed.fields.map(v => !!v.inline).lastIndexOf(false) + 1).length % 3) % 3
      while (count--)
        embed.fields.push({ name: '\u200b', value: '\u200b', inline: true })
    } else embed.fields.push({
      name: 'Properties',
      value: props.map(prop => `\`${prop.name}\``).join(' ')
    })
  }

  attachMethods(embed, { excludePrivateElements } = {}) {
    if (!this.methods) return

    let methods = this.methods
    if (excludePrivateElements) methods = methods.filter(prop => prop.access !== 'private')
    if (methods.length === 0) return

    embed.fields.push({
      name: 'Methods',
      value: methods.map(method => `\`${method.name}\``).join(' ')
    })
  }

  attachEvents(embed) {
    if (!this.events) return
    embed.fields.push({
      name: 'Events',
      value: this.events.map(event => `\`${event.name}\``).join(' ')
    })
  }

  attachParams(embed) {
    if (!this.params) return
    const params = this.params.map(param => {
      return stripIndents`
        ${param.formattedName} ${param.formattedType}
        ${param.deprecated ? '**DEPRECATED**' : ''}
        ${param.formattedDescription}
      `
    })

    const shift = params.shift()
    embed.fields.push({ name: 'Params', value: shift, inline: true })

    while (params.length > 0) {
      const shift = params.shift()
      embed.fields.push({ name: '\u200b', value: shift, inline: true })
    }
    let count = (3 - embed.fields.slice(embed.fields.map(v => !!v.inline).lastIndexOf(false) + 1).length % 3) % 3
    while (count--)
      embed.fields.push({ name: '\u200b', value: '\u200b', inline: true })
  }

  attachReturn(embed) {
    if (!this.returns) return
    embed.fields.push({
      name: 'Returns',
      value: this.formattedReturn
    })
  }

  attachType(embed) {
    if (!this.type) return
    embed.fields.push({
      name: 'Type',
      value: this.formattedType
    })
  }

  attachExamples(embed) {
    if (!this.examples) return
    embed.fields.push({
      name: 'Examples',
      value: this.examples.map(ex => `\`\`\`js\n${ex}\n\`\`\``).join('\n')
    })
  }

  toJSON() {
    const json = {
      name: this.name,
      description: this.description,
      internal_type: this.docType
    }

    if (this.props) json.props = this.props.map(prop => prop.name)
    if (this.parent) json.parent = this.parent.name
    if (this.methods) json.methods = this.methods.map(method => method.name)
    if (this.events) json.events = this.events.map(event => event.name)
    if (this.params) json.params = this.params.map(param => param.toJSON())
    if (this.type) json.type = this.type.join('')
    if (this.examples) json.examples = this.examples

    return json
  }

  formatInherits(inherits) {
    inherits = Array.isArray(inherits[0])
      ? inherits.map(element => element.flat(5)) // docgen 0.9.0 format
      : inherits.map(baseClass => [baseClass]) // docgen 0.8.0 format

    return inherits.map(baseClass => this.doc.formatType(baseClass)).join(' and ')
  }

  formatText(text) {
    if (!text) return ''

    return text
      .replace(/\{@link (.+?)\}/g, (match, string) => {
        // const [url, ...text] = string.split(/\|| /); // slower ~40% than substr
        const pos = string.search(/\|| /);
        let url, text;
        if (pos !== -1) {
          url = string.substr(0, pos);
          text = string.substr(pos + 1);
        } else url = string;
        const element = this.doc.get(...url.replace("event:", "").split(/\.|#/))
        return `[${element ? element.formattedName : (text || url)}](${element ? element.url : url})`
      })
      .replace(/(```[^]+?```)|(^[*-].+$)?\n(?![*-])/gm, (match, codeblock, hasListBefore) => {
        if (codeblock) return codeblock
        if (hasListBefore) return match
        return ' '
      })
      .replace(/<(info|warn)>([^]+?)<\/(?:\1)>/g, '\n**$2**\n')
      .replace(/<\/?p>/g, '') // remove paragraph tags
      .replace(/<\/?code>/g, '`') // format code tags
      .replace(/<a href="(.+)">(.+)<\/a>/g, '[$2]($1)') // format anchor tags
  }

  static get types() {
    return DocBase.types
  }
}

module.exports = DocElement
