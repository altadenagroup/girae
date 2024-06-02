import { PaginatedScene, PaginatedSceneData } from '../sessions/paginated-scene.js'
import { MEDAL_MAP } from '../constants.js'
import { getHowManyCardsUserHas } from '../utilities/engine/users.js'

interface UserData extends PaginatedSceneData {
  id: number
  name: string
  userOwnedCards: number
  resultsCount?: number
}

const modifierDescriptions = {
  '1': 'com raridade comum',
  '2': 'com raridade rara',
  '3': 'com raridade lendária'
}

export const CARDS_PER_PAGE = 15

class CardPages extends PaginatedScene<UserData> {
  constructor () {
    super('SHOW_CRDS', [])

    this.addModifier('1', '🥉')
    this.addModifier('2', '🥈')
    this.addModifier('3', '🥇')
  }

  async getCards (data: UserData) {
    let filter = {
      card: {}
    }

    if (data.currentModifiers.includes('1')) {
      filter.card['rarityId'] = 1
    }

    if (data.currentModifiers.includes('2')) {
      filter.card['rarityId'] = 3
    }

    if (data.currentModifiers.includes('3')) {
      filter.card['rarityId'] = 4
    }

    const r = await _brklyn.db.userCard.findMany({
      where: {
        ...filter,
        userId: data.id
      },
      include: {
        card: {
          include: {
            rarity: true,
            category: true,
            subcategory: true
          }
        }
      },
      skip: data.currentPage * CARDS_PER_PAGE || 0,
      take: CARDS_PER_PAGE,
      // sort by rarity id: 4 first, 3 second, 1 last
      orderBy: [{
        card: {
          rarityId: 'desc'
        }
      }, {
        card: {
          categoryId: 'asc'
        }
      }, {
        card: {
          id: 'asc'
        }
      }],
      distinct: ['cardId']
    })


    const resultCount = await _brklyn.db.userCard.count({ where: { userId: data.id, ...filter } })
    data.resultsCount = resultCount

    // update total pages. if it differs from current total, change current page to 0
    if (Math.ceil(resultCount / CARDS_PER_PAGE) !== data.totalPages) {
      data.totalPages = Math.ceil(resultCount / CARDS_PER_PAGE)
      data.currentPage = 0
    }

    return r
  }

  async formatCard (userId, card) {
    const count = await getHowManyCardsUserHas(userId, card.card.id)
    return `${card.card.category?.emoji} ${MEDAL_MAP[card.card.rarity?.name || 'Comum']} <code>${card.card.id}</code>. <b>${card.card.name}</b> <code>${count}x</code> — <i>${card.card.subcategory?.name}</i>`
  }

  generateFilterAdvise (data) {
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

  generatePageInfo (data) {
    if (data.totalPages === 1) return ''
    return `📃 Página <code>${data.currentPage + 1}</code> de <b>${data.totalPages}</b>\n`
  }

  async generateText (data): Promise<string> {
    const cards = await this.getCards(data)
    const texts = await Promise.all(cards.map((card) => this.formatCard(data.id, card)))

    return `👤 <code>${data.id}</code>. Cards de <b>${data.name}</b>
🎲 <code>${data.totalCards}</code> cards no total.
${this.generateFilterAdvise(data)}
${texts.join('\n') || '<i>Nenhum card para mostrar.</i>'}

${this.generatePageInfo(data)}👀 Para ver um desses cards, use <code>/card id</code>.`
  }
}

export default new CardPages()
