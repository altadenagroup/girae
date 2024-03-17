import {Subcategory} from "@prisma/client"

export const createSubcategory = async (name: string, categoryID: number) => {
  return _brklyn.db.subcategory.create({
    data: {
      name,
      categoryId: categoryID
    }
  })
}

export const getSubcategoryByID = async (id: number): Promise<Subcategory | null | undefined> => {
  return _brklyn.db.subcategory.findUnique({
    where: {
      id
    }
  })
}

export const getSubcategoryByName = async (name: string) => {
  const cached = await _brklyn.cache.get('subcategories_name', name)
  if (cached) return cached

  const subcategory = await _brklyn.db.subcategory.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive'
      }
    }
  })

  if (subcategory) {
    await _brklyn.cache.setexp('subcategories_name', name, subcategory, 5 * 60)
  }

  return subcategory
}

export const searchSubcategories = async (name: string) => {
  const cached = await _brklyn.cache.get('subcategories_search', name)
  if (cached) return cached

  const subcategories = await _brklyn.db.subcategory.findMany({
    where: {
      name: {
        search: name
      }
    },
    include: {
      category: true
    }
  })

  if (subcategories) {
    await _brklyn.cache.setexp('subcategories_search', name, subcategories, 5 * 60)
  }

  return subcategories
}

export const getOrCreateSubcategory = async (name: string, categoryID: number) => {
  const sub = await getSubcategoryByName(name)
  if (sub) return sub
  return createSubcategory(name, categoryID)
}

// selects random subcategories under a certain category id (as long as they have cards in them)
export const getRandomSubcategories = async (categoryID: number, limit: number) => {
  const subcategories = await _brklyn.db.subcategory.findMany({
    where: {
      categoryId: categoryID,
      cards: {some: {}}
    }
  })

  return subcategories.sort(() => Math.random() - Math.random()).slice(0, limit)
}
