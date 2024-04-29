import { cpSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { info } from 'melchior'
import { PrismaClient } from '@prisma/client'
// prints rainbow text to the console
const COLORS = ['\x1b[31m', '\x1b[33m', '\x1b[32m', '\x1b[36m', '\x1b[35m', '\x1b[34m']

const rainbow = (text: string) => {
  let i = 0
  return text.split('').map(char => {
    if (char === ' ') return char
    i++
    return `${COLORS[i % COLORS.length]}${char}`
  }).join('')
}

export const checkIfDockerIsInstalled = () => {
  try {
    execSync('docker -v')
    return true
  } catch (error) {
    return false
  }
}

export const checkIfIsFirstBoot = () => {
  // if there's no .env.TELEGRAM_TOKEN, it's development.
  if (!process.env.DATABASE_URL) {
    console.log(rainbow('Boas-vindas à Giraê!'))
    console.log('Parece que é a primeira vez que você está rodando o bot.')
    const isDockerInstalled = checkIfDockerIsInstalled()
    if (!isDockerInstalled) {
      console.log('Parece que você não tem o Docker instalado.')
      console.log('O Docker é necessário para gerenciar as dependências do bot, como os bancos de dados.')
      console.log('Por favor, instale o Docker e tente novamente. Você pode baixar o Docker em https://www.docker.com/products/docker-desktop')
      process.exit(1)
    }
    console.log('Vamos configurar algumas coisas para você.')
    console.log('Começaremos criando o arquivo .env.')
    // copy .env.example to .env
    cpSync('.env.example', '.env')
    console.log('Arquivo .env criado com sucesso. Para executar a bot, você precisará preencher as configurações no arquivo .env.')
    console.log('Quando terminar, execute a bot novamente.')
    process.exit(0)
  }
}

export const populateDatabase = async (prisma: PrismaClient) => {
  // if there's no userBackground, create one
  const userBackground = await prisma.profileBackground.findFirst()
  if (!userBackground) {
    await prisma.profileBackground.create({
      data: {
        name: 'Life is (not) good',
        image: 'url:https://i.pinimg.com/originals/73/7c/5e/737c5e202d0325265b42a501eeaaf7c7.jpg'
      }
    })
    info('development', 'created a default user background')
  }

  // if there are no rarities, create 3: comum (id 1), raro (id 3) and legendary (id 4)
  const rarities = await prisma.rarity.findFirst()
  if (!rarities) {
    await prisma.rarity.createMany({
      data: [
        { name: 'Comum', id: 1, chance: 0.7 },
        { name: 'Raro', id: 3, chance: 0.2 },
        { name: 'Lendário', id: 4, chance: 0.1 }
      ]
    })
    info('development', 'created default rarities')
  }

  // if there are no categories, create 4: letras do alfabeto, números, emojis, e símbolos
  // delete all categories
  const categories = await prisma.category.findFirst()
  if (!categories) {
    await prisma.category.createMany({
      data: [
        { name: 'Letras do Alfabeto', emoji: '🔤' },
        { name: 'Diversos', emoji: '🔢' },
      ]
    })

    info('development', 'created default categories')
  }

  const subcategories = await prisma.subcategory.findFirst()
  if (!subcategories) {
    const result = await prisma.category.findMany()
    await prisma.subcategory.createMany({
      data: [
        { name: 'Letras Maiúsculas', categoryId: result[0].id },
        { name: 'Letras Minúsculas', categoryId: result[0].id },
        { name: 'Letras Coreanas', categoryId: result[0].id },
        { name: 'Letras do Katakana', categoryId: result[0].id },
        { name: 'Letras do Hiragana', categoryId: result[0].id },
        { name: 'Números', categoryId: result[1].id },
        { name: 'Emojis', categoryId: result[1].id },
        { name: 'Símbolos', categoryId: result[1].id }
      ]
    })

    info('development', 'created default subcategories')
  }

  // if there are no cards, create cards for each subcategory
  const cards = await prisma.card.findFirst()

  if (!cards) {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'
    const uppercase = alphabet.toUpperCase()
    const hangulConsonantsAndVowels = 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ'
    const katakana = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
    const hiragana = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'
    const numbers = '0123456789'
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?/\\'
    const subcategories = await prisma.subcategory.findMany()
    const result = await prisma.category.findMany()
    const rarities = await prisma.rarity.findMany()
    const randomRarity = () => rarities[Math.floor(Math.random() * rarities.length)]
    await prisma.card.createMany({
      data: [
        ...alphabet.split('').map(letter => ({ name: letter, subcategoryId: subcategories[1].id, rarityId: randomRarity().id, categoryId: result[0].id, rarityModifier: 0 })),
        ...uppercase.split('').map(letter => ({ name: letter, subcategoryId: subcategories[0].id, rarityId: randomRarity().id, categoryId: result[0].id, rarityModifier: 0 })),
        ...hangulConsonantsAndVowels.split('').map(letter => ({ name: letter, subcategoryId: subcategories[2].id, rarityId: randomRarity().id, categoryId: result[0].id, rarityModifier: 0 })),
        ...katakana.split('').map(letter => ({ name: letter, subcategoryId: subcategories[3].id, rarityId: randomRarity().id, categoryId: result[0].id, rarityModifier: 0 })),
        ...hiragana.split('').map(letter => ({ name: letter, subcategoryId: subcategories[4].id, rarityId: randomRarity().id, categoryId: result[0].id, rarityModifier: 0 })),
        ...numbers.split('').map(number => ({ name: number, subcategoryId: subcategories[5].id, rarityId: randomRarity().id, categoryId: result[1].id, rarityModifier: 0 })),
        ...symbols.split('').map(symbol => ({ name: symbol, subcategoryId: subcategories[7].id, rarityId: randomRarity().id, categoryId: result[1].id, rarityModifier: 0 }))
      ]
    })

    info('development', 'created default cards')
  }

  // get the user id 1. make them an admin
  const user = await prisma.user.findUnique({ where: { id: 1 } })
  if (user && !user.isAdmin) {
    await prisma.user.update({ where: { id: 1 }, data: { isAdmin: true } })
    info('development', 'made user 1 an admin')
  }
}
