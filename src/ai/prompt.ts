/* AI example files are simple text files that contain examples of the input that the AI should generate.

They look like this:
<<< INPUT
...
>>> OUTPUT
...
<<< END

This class parses those files and returns an array of examples, containing which role the example is for and the text of the example.
 */
import { readFileSync, statSync } from 'fs'

interface LLMDefinition<T> {
  name: string
  user: string
  system: string
  exampleBuilder: (isInput: boolean, text: string) => T
  requestBuilder: (text: string, examples: T[], sys: string) => any
}

export class LLMNaming {
  static get (name: string) {
    if (name === 'gemini') {
      return LLMNaming.gemini
    }
    throw new Error('Invalid LLM name')
  }

  static get gemini (){
    return {
      name: 'gemini',
      user: 'user',
      system: 'model',
      exampleBuilder: (isInput, text) => ({
        role: isInput ? 'user' : 'model',
        parts: [{ text }]
      }),
      requestBuilder: (text, examples, sys) => ({
        contents: [
          { role: 'user', parts: [{ text: sys }] },
          { role: 'model', parts: [{ text: 'Ok, irei fazer isso. Envie exemplos e responderei de acordo.' }] },
          ...examples, { role: 'user', parts: [{ text }] }]
      })
    }
  }
}

export class AIPrompt {
  private naming: LLMDefinition<any> | undefined
  private readonly generatedExamples: any[] | undefined
  private readonly content: string

  constructor (path: string) {
    // check if path is a folder, if it isn't, throw error
    if (!statSync(path).isDirectory()) {
      throw new Error('Path must be a folder')
    }

    // check for system.txt and examples.txt files. also read info.json
    const infoPath = path + '/info.json'
    const systemPath = path + '/system.txt'
    const examplesPath = path + '/examples.txt'
    this.parseInfoFIle(readFileSync(infoPath, 'utf-8'))
    if (!statSync(systemPath).isFile()) {
      throw new Error('System file not found')
    }

    this.content = readFileSync(systemPath, 'utf-8')
    if (statSync(examplesPath).isFile()) {
      this.generatedExamples = this.parseExampleFile(readFileSync(examplesPath, 'utf-8'))
    }
  }

  private parseInfoFIle (text: string) {
    const info = JSON.parse(text)
    this.naming = LLMNaming.get(info.model.name)
  }

  build (text: string) {
    if (!this.generatedExamples) {
      throw new Error('No examples found')
    }

    return this.naming!.requestBuilder(text, this.generatedExamples, this.content)
  }

  private parseExampleFile (text: string) {
    const lines = text.split('\n')
    const examples: any[] = []
    let currentRole = ''
    let currentText = ''

    for (const line of lines) {
      if (line.startsWith('<<< INPUT')) {
        if (currentRole !== '') {
          examples.push(this.naming!.exampleBuilder(currentRole === 'user', currentText))
        }
        currentRole = 'user'
        currentText = ''
      } else if (line.startsWith('>>> OUTPUT')) {
        if (currentRole !== '') {
          examples.push(this.naming!.exampleBuilder(currentRole === 'user', currentText))
        }
        currentRole = 'assistant'
        currentText = ''
      } else if (line.startsWith('<<< END')) {
        examples.push(this.naming!.exampleBuilder(currentRole === 'user', currentText))
        currentRole = ''
        currentText = ''
        break
      } else {
        currentText += line
      }
    }

    if (currentRole !== '') {
      examples.push(this.naming!.exampleBuilder(currentRole === 'user', currentText))
    }

    return examples.filter(e => e && e.parts.length > 0 && e.parts[0].text.length > 0)
  }
}
