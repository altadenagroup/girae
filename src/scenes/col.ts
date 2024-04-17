import { Card } from '@prisma/client'
import { PaginatedScene, PaginatedSceneData } from '../sessions/paginated-scene.js'
import { MEDAL_MAP } from '../constants.js'

interface CollectionData extends PaginatedSceneData {
  id: number
  name: string
  emoji: string
  totalCards: number
  userOwnedCards: number
  userOwned: number[]
  resultsCount?: number
  onlySecondary: boolean
}

const modifierDescriptions = {
  '1': 'que você possui',
  '2': 'que você não possui',
  '3': 'com raridade comum',
  '4': 'com raridade rara',
  '5': 'com raridade lendária'
}

class CollectionPages extends PaginatedScene<CollectionData> {
  constructor () {
    super('SHOW_CLC', [])

    this.addModifier('1', '☀')
    this.addModifier('2', '🌙')
    this.addModifier('3', '🥉')
    this.addModifier('4', '🥈')
    this.addModifier('5', '🥇')
  }

  async getCards (data: CollectionData, subcategoryId: number): Promise<Card[]> {
    let filter = {}
    if (data.onlySecondary) {
      filter['secondarySubcategories'] = {
        some: {
          id: subcategoryId
        }
      }
    } else {
      filter['subcategoryId'] = subcategoryId
    }

    if (data.currentModifiers.includes('1')) {
      filter['id'] = {
        in: data.userOwned
      }
    }

    if (data.currentModifiers.includes('2')) {
      filter['id'] = {
        notIn: data.userOwned
      }
    }

    if (data.currentModifiers.includes('3')) {
      filter['rarityId'] = {
        in: [...(filter['rarityId']?.in || []), 1]
      }
    }

    if (data.currentModifiers.includes('4')) {
      filter['rarityId'] = {
        in: [...(filter['rarityId']?.in || []), 3]
      }
    }

    if (data.currentModifiers.includes('5')) {
      filter['rarityId'] = {
        in: [...(filter['rarityId']?.in || []), 4]
      }
    }

    const r = await _brklyn.db.card.findMany({
      where: {
        ...filter
      },
      include: {
        rarity: true,
        category: true
      },
      skip: data.currentPage * 20 || 0,
      take: 20,
      // sort by rarity id: 4 first, 3 second, 1 last
      orderBy: [{
        // order by rarity id and id itself
        rarityId: 'desc'
      }, {
        id: 'asc'
      }]
    })

    const resultCount = await _brklyn.db.card.count({ where: filter })
    data.resultsCount = resultCount

    // update total pages. if it differs from current total, change current page to 0
    if (Math.ceil(resultCount / 20) !== data.totalPages) {
      data.totalPages = Math.ceil(resultCount / 20)
      data.currentPage = 0
    }

    return r
  }

  formatCard (card, data: CollectionData) {
    const userOwnsCard = data.userOwned.filter(uc => uc === card.id).length
    return `${MEDAL_MAP[card.rarity?.name || 'Comum']} <code>${card.id}</code>. <b>${card.name}</b> ${userOwnsCard > 0 ? `<code>${userOwnsCard}x</code>` : card.category?.emoji}`
  }

  generateFilterAdvise (data: CollectionData) {
    let text = '🔎 Mostrando apenas cards <b>'
    const filters = data.currentModifiers.map((m) => modifierDescriptions[m])

    if (filters.length === 0) {
      return ''
    }

    if (filters.length === 1) {
      text += filters[0]
    } else {
      text += filters.slice(0, -1).join(', ') + ' e ' + filters.slice(-1)
    }

    return text + `</b> (<code>${data.resultsCount!}</code> resultados)\n`
  }

  generatePageInfo (data: CollectionData) {
    if (data.totalPages === 1) return ''
    return `📃 Página <code>${data.currentPage + 1}</code> de <b>${data.totalPages}</b>\n`
  }

  async generateText (data: CollectionData): Promise<string> {
    const cards = await this.getCards(data, data.id)
    const texts = cards.map((c) => this.formatCard(c, data))

    return `${data.emoji} <code>${data.id}</code>. <b>${data.name}</b> ${data.onlySecondary ? '<i>(tag)</i>' : ''}
🎲 <code>${data.totalCards}</code> cards no total, <code>${data.userOwnedCards}</code> na sua coleção.
${this.generateFilterAdvise(data)}
${texts.join('\n') || '<i>Nenhum card para mostrar.</i>'}

${this.generatePageInfo(data)}👀 Para ver um desses cards, use <code>/card id</code>.`
  }
}

export default new CollectionPages()
