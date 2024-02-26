export const createSubcategory = async (name: string, categoryID: number) => {
    const subcategory = await _brklyn.db.subcategory.create({
        data: {
            name,
            categoryId: categoryID
        }
    })

    return subcategory
}

export const getSubcategoryByID = async (id: number) => {
    const cached = await _brklyn.cache.get('subcategories_id', id.toString())
    if (cached) return cached

    const subcategory = await _brklyn.db.subcategory.findUnique({
        where: {
            id
        }
    })

    if (subcategory) {
        await _brklyn.cache.set('subcategories_id', id.toString(), subcategory)
    }

    return subcategory
}

export const getSubcategoryByName = async (name: string) => {
    const cached = await _brklyn.cache.get('subcategories_name', name)
    if (cached) return cached

    const subcategory = await _brklyn.db.subcategory.findFirst({
        where: {
            name
        }
    })

    if (subcategory) {
        await _brklyn.cache.setexp('subcategories_name', name, subcategory, 60 * 60 * 24)
    }

    return subcategory
}

export const getOrCreateSubcategory = async (name: string, categoryID: number) => {
    const sub = await getSubcategoryByName(name)
    if (sub) return sub
    return createSubcategory(name, categoryID)
}