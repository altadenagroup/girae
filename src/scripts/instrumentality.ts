// just like evangelion's instrumentality, this script takes in an array of cards to be inserted into the database
enum CardRarity {
  Common = 1,
  Rare = 3,
  Legendary = 4
}

export interface InstrumentalityCard {
  name: string
  subcategory: string
  image?: string
  rarity: CardRarity
  tags?: string[]
}

export const runInstrumentality = async (cards: InstrumentalityCard[], categoryId: number) => {
  // first, we have to get all of the subcatgories in the cards and create them if they don't exist
  const subcategories = cards.map(card => card.subcategory)
  const uniqueSubcategories = [...new Set(subcategories)]
  const subcategoryToIdMap = new Map<string, number>()

  // check if the subcategories exist in the database
  const subcategoryExists = await _brklyn.db.subcategory.findMany({
    where: {
      name: {
        in: uniqueSubcategories
      }
    }
  })
  console.log(`${subcategoryExists.length} subcategories out of ${uniqueSubcategories.length} already exist`)

  // add the subcategories that don't exist
  for (const subcategory of uniqueSubcategories) {
    if (!subcategoryExists.some(sub => sub.name === subcategory)) {
      const insert = await _brklyn.db.subcategory.create({
        data: {
          name: subcategory,
          categoryId
        }
      })
      subcategoryToIdMap.set(subcategory, insert.id)
    }
  }

  // add the subcategories that do exist
  for (const subcategory of subcategoryExists) {
    subcategoryToIdMap.set(subcategory.name, subcategory.id)
  }

  // sleep for 10 seconds to allow the user to cancel the operation
  console.log('Decisionmaking process initiated. Operations will resume in 10 seconds. Please use Ctrl-C to cancel operation')
  await new Promise(resolve => setTimeout(resolve, 10000))

  // insert the cards
  const insert = await _brklyn.db.card.createMany({
    data: cards.map(card => {
      return {
        name: card.name,
        subcategoryId: subcategoryToIdMap.get(card.subcategory),
        image: card.image,
        rarityId: card.rarity,
        categoryId,
        tags: card.tags || [],
        rarityModifier: 0
      }
    })
  })

  // print the amount of created cards, created subcategories
  console.log(`Created ${insert.count} cards`)
  console.log(`Created ${subcategoryToIdMap.size - subcategoryExists.length} subcategories`)

  return insert
}

export const runReverter = async (ids: number[]) => {
  const del = await _brklyn.db.card.deleteMany({
    where: {
      id: {
        in: ids
      }
    }
  })

  console.log(`Deleted ${del.count} cards`)
}

export const runAntiDupe = async () => {
  // when getting the cards, select only the name, image, and subcategory (including the sub name)
  // use a stream to avoid memory issues
  let cards = await _brklyn.db.card.findMany({
    select: {
      id: true,
      name: true,
      image: true,
      subcategory: {
        select: {
          name: true
        }
      },
      category: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  // check for duplicates
  const duplicateMap = new Map<string, number[]>()
  for (const card of cards) {
    const key = `${card.name}-${card.image}-${card.subcategory!.name}`
    if (duplicateMap.has(key)) {
      duplicateMap.get(key)!.push(card.id)
    } else {
      duplicateMap.set(key, [card.id])
    }
  }

  // remove all non-duplicates
  for (const [key, value] of duplicateMap) {
    if (value.length === 1) {
      duplicateMap.delete(key)
    }
  }

  // filter cards to only include duplicates
  cards = cards.filter(card => {
    const key = `${card.name}-${card.image}-${card.subcategory!.name}`
    return duplicateMap.has(key)
  })

  // delete duplicates
  const ids: number[] = []
  for (const [, value] of duplicateMap) {
    if (value.length > 1) {
      ids.push(...value.slice(1))
    }
  }


  // print the amount of duplicates
  console.log(`Found ${ids.length} duplicates`)

  // print duplicates across categories
  const categoryMap = new Map<string, number>()
  for (const card of cards) {
    if (categoryMap.has(card.category.name)) {
      categoryMap.set(card.category.name, categoryMap.get(card.category.name)! + 1)
    } else {
      categoryMap.set(card.category.name, 1)
    }
  }

  // sleep for 10 seconds to allow the user to cancel the operation
  console.log('Decisionmaking process initiated. Operations will resume in 10 seconds. Please use Ctrl-C to cancel operation')
  await new Promise(resolve => setTimeout(resolve, 10000))


  // delete in batches of 32k
  const batchedIds: number[][] = []
  while (ids.length > 0) {
    batchedIds.push(ids.splice(0, 32000))
  }

  for (const id of batchedIds) {
    const del = await _brklyn.db.card.deleteMany({
      where: {
        id: {
          in: id
        }
      }
    })
    console.log(`Deleted ${del.count} cards`)
  }

  console.log(`Deleted all duplicated cards`)
}
