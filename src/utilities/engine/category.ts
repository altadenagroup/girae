export const getCategoryByName = async (name: string) => {
  const cached = await _brklyn.cache.get('categories_name', name)
  if (cached) return cached

  const category = await _brklyn.db.category.findFirst({
    where: {
      name
    }
  })

  if (category) {
    await _brklyn.cache.setexp('categories_name', name, category, 60 * 60 * 24)
  }

  return category
}

export const getOrCreateCategory = async (name: string) => {
  const cat = await getCategoryByName(name)
  if (cat) return cat
  return createCategory(name)
}

export const createCategory = async (name: string) => {
  const category = await _brklyn.db.category.create({
    data: {
      name,
      emoji: '🎨'
    }
  })

  return category
}

export const getAllCategories = async () => {
  const cached = await _brklyn.cache.get('categories_all', 'all')
  if (cached) return cached

  let categories = await _brklyn.db.category.findMany()
  categories = categories.filter((c) => c.id !== 0).filter(a => !a.hidden).sort((a, b) => a.id - b.id)
  await _brklyn.cache.setexp('categories_all', 'all', categories, 24 * 60 * 60)

  return categories
}

export const getCategoryByID = async (id: number) => {
  const cached = await _brklyn.cache.get('categories_id', id.toString())
  if (cached) return cached

  const category = await _brklyn.db.category.findFirst({
    where: {
      id
    }
  })

  if (category) {
    await _brklyn.cache.setexp('categories_id', id.toString(), category, 60)
  }

  return category
}

export const searchCategory = async (query: string) => {
  const cached = await _brklyn.cache.get('categories_search', query)
  if (cached) return cached

  const categories = await _brklyn.db.category.findMany({
    where: {
      name: {
        search: query
      }
    }
  })

  if (categories) {
    await _brklyn.cache.setexp('categories_search', query, categories, 5 * 60)
  }

  return categories
}

// gets how many cards are in a category
export const getCountOfCardsOnCategory = async (id: number) => {
  const cached = await _brklyn.cache.get('categories_card_count', id.toString())
  if (cached) return cached

  const count = await _brklyn.db.card.count({
    where: {
      categoryId: id
    }
  })

  if (!count) return 0
  await _brklyn.cache.setexp('categories_card_count', id.toString(), count, 60 * 60 * 24)

  return count
}


