import {Subcategory} from "@prisma/client"
import { getRandomNumber } from "../misc.js"

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
    },
    include: {
      category: true
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
    },
    include: {
      category: true
    }
  })

  if (subcategory) {
    await _brklyn.cache.setexp('subcategories_name', name, subcategory, 10)
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

export const getSubcategoriesByCategoryID = async (categoryID: number) => {
  return _brklyn.db.subcategory.findMany({
    where: {
      categoryId: categoryID
    }
  })
}

// filters subcategory by their chance. if a subcategory has a chance value, it will be taken into consideration. if the chance is 1, it is guaranteed to be selected. if it is 0.7, it has a 70% chance of being selected.
// subcategories with a chance of 0 will be randomly selected. has a limit of how many subcategories to return.
export const getRandomSubcategories = async (categoryID: number, limit: number) => {
  const subcategories = await _brklyn.db.subcategory.findMany({
    where: {
      categoryId: categoryID,
      cards: { some: {} }
    }
  })

  if (subcategories.length <= limit) return subcategories

  const result: Subcategory[] = []
  const chanceSubcategories = subcategories.filter(sub => sub.rarityModifier)
  chanceSubcategories.forEach(sub => {
    const random = getRandomNumber()
    if (sub.rarityModifier > random) result.push(sub)
  })

  while (result.length < limit) {
    const t = subcategories[Math.floor(getRandomNumber() * subcategories.length)]
    if (!result.some(sub => sub.id === t.id)) result.push(t)
  }

  return result
}


