import { Subcategory } from '@prisma/client'
import { PaginatedScene, PaginatedSceneData } from '../sessions/paginated-scene.js'

interface CategoryData extends PaginatedSceneData {
  id: number
  name: string
  emoji: string
  totalSubs: number
}

interface SubWithCardCount extends Subcategory {
  _count: {
    cards: number
  }
}

class CategoryPages extends PaginatedScene<CategoryData> {
  constructor () {
    super('SHOW_CTG', [])
  }

  async getSubs (data: CategoryData): Promise<SubWithCardCount[]> {
    const r = await _brklyn.db.subcategory.findMany({
      where: {
        categoryId: data.id,
        isSecondary: false
      },
      include: {
        _count: {
          select: {
            cards: true
          }
        }
      },
      skip: data.currentPage * 20 || 0,
      take: 20,
      // sort by rarity id: 4 first, 3 second, 1 last
      orderBy: [{
        id: 'asc'
      }]
    })

    return r
  }

  formatSub (card: SubWithCardCount, data: CategoryData) {
    return `${data.emoji} <code>${card.id}</code>. <b>${card.name}</b> (<code>${card._count.cards}</code> cards)`
  }

  generatePageInfo (data: CategoryData) {
    if (data.totalPages === 1) return ''
    return `📃 Página <code>${data.currentPage + 1}</code> de <b>${data.totalPages}</b>\n`
  }

  async generateText (data: CategoryData): Promise<string> {
    const cards = await this.getSubs(data)
    const texts = cards.map((c) => this.formatSub(c, data))

    return `${data.emoji} <code>${data.id}</code>. <b>${data.name}</b>
🎲 <code>${data.totalSubs}</code> subcategorias no total.

${texts.join('\n')}

${this.generatePageInfo(data)}👀 Para ver uma dessas subcategorias, use <code>/clc id</code>.`
  }
}

export default new CategoryPages()
