import { GoogleGenerativeAI } from '@google/generative-ai'
import { AIPrompt } from './prompt.js'

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export class AI {
  private gemini = ai.getGenerativeModel({
    model: 'gemini-pro'
  })
  private addCard = new AIPrompt('src/prompts/add-card.prompt')

  async generateCard (text: string) {
    return await this.gemini.generateContent(this.addCard.build(text)).then(({ response }) => {
      const r = response.text()
      if (!r) return null
      // remove {{ anything... }}
      const json = r.replace(/{{.*}}/, '').trim()
      try {
        const data = JSON.parse(json)
        if (data.error) return data
        if (data.image === 'null') delete data.image
        // add url: to image if it exists
        if (data.image) data.image = `url:${data.image}`
        return data
      } catch (_) {
        // the AI probably returned invalid json, so return whatever it said on the error field
        return { error: r }
      }
    })
  }
}
