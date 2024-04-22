import { readFileSync } from 'fs'

const prompt = readFileSync('src/prompts/card-prompt.txt', 'utf-8')


export const generate = (text: string) => _brklyn.ai.chat.completions.create({
  model: 'gpt-3.5-turbo-0125',
  messages: [
    {
      'role': 'system',
      'content': prompt
    },
    {
      'role': 'user',
      'content': 'serena van der woodsen, Legendary, gossip girl (série de tv) https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS-PeDHnb0aYghQYfqJ-oh4wO3TKMhGyoWVZy5Z5kJ6fvNFt9EZKq1dpVE&s=10'
    },
    {
      'role': 'assistant',
      'content': '{{ van der Woodsen is a character of Gossip GIrl, which is a TV show, so TV > Gossip Girl. }} {\n    "name": "Serena van der Woodsen",\n    "subcategory": "Gossip Girl",\n    "rarity": "Legendary",\n    "image": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS-PeDHnb0aYghQYfqJ-oh4wO3TKMhGyoWVZy5Z5kJ6fvNFt9EZKq1dpVE&s=10",\n    "category": "TV",\n    "tags": ["Gossip Girl"]\n}'
    },
    {
      'role': 'user',
      'content': 'Presto, Rare, TV\\nhttps://brandedinthe80s.com/6790/cartoon-commentary-14-presto-the-giant-killer'
    },
    {
      'role': 'assistant',
      'content': '{{Presto is a character from the TV series Dungeons & Dragons , so TV > Dungeons & Dragons. }} {\n    "name": "Presto",\n    "subcategory": "Dungeons & Dragons",\n    "rarity": "Rare",\n    "image": "https://brandedinthe80s.com/6790/cartoon-commentary-14-presto-the-giant-killer",\n    "category": "TV",\n    "tags": ["Dungeons & Dragons"]\n}'
    },
    {
      'role': 'user',
      'content': 'Philza, QSMP\\nhttps://pin.it/2bDLA4aOo'
    },
    {
      'role': 'assistant',
      'content': '{{Philza is a gaming streamer, QSMP corresponds to Variedades > YouTubers/Streamers.}} {\n    "name": "Philza",\n    "subcategory": "YouTubers/Streamers",\n    "rarity": "Common",\n    "image": "https://pin.it/2bDLA4aOo",\n    "category": "Variedades",\n    "tags": ["QSMP"]\n}'
    },
    {
      'role': 'user',
      'content': 'Carminha, Legendary, Personagens da Teledramaturgia brasileira\\nhttps://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQTz1-TfA4cNMYkNoktravO7e6Cghuzym5O_B9hYQzq0DOdMpAPMO4Mm5w&s=10'
    },
    {
      'role': 'assistant',
      'content': '{{Carminha is a character from the Brazilian soap opera Avenida Brasil, so TV > Avenida Brasil.}}{\n    "name": "Carminha",\n    "subcategory": "Avenida Brasil",\n    "rarity": "Legendary",\n    "image": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQTz1-TfA4cNMYkNoktravO7e6Cghuzym5O_B9hYQzq0DOdMpAPMO4Mm5w&s=10",\n    "category": "TV",\n    "tags": ["Avenida Brasil"]\n}'
    },
    {
      'role': 'user',
      'content': 'Gerard way, Rare, my chemical romance (música)'
    },
    {
      'role': 'assistant',
      'content': '{{Gerard Way is the lead singer of My Chemical Romance, so Música > Artistas de Rock.}}{\n    "name": "Gerard Way",\n    "subcategory": "Artistas de Rock",\n    "rarity": "Rare",\n    "image": null,\n    "category": "Música",\n    "tags": ["My Chemical Romance"]\n}'
    },
    {
      'role': 'user',
      'content': 'nunew chawarin, Common, atores tailandeses'
    },
    {
      'role': 'assistant',
      'content': '{{Nunew Chawarin is a Thai actor, so Variedades > Atores Tailandeses.}}{\n    "name": "Nunew Chawarin",\n    "subcategory": "Atores Tailandeses",\n    "rarity": "Common",\n    "image": null,\n    "category": "Variedades",\n    "tags": []\n}'
    },
    {
      'role': 'user',
      'content': 'seulgi, Legendary'
    },
    {
      'role': 'assistant',
      'content': '{{Seulgi is a member of Red Velvet, a popular K-Pop group from South Korea. Hence, GIRÁSIA > Red Velvet.}}{\n    "name": "Seulgi",\n    "subcategory": "Red Velvet",\n    "rarity": "Legendary",\n    "image": null,\n    "category": "GIRÁSIA",\n    "tags": []\n}'
    },
    {
      'role': 'user',
      'content': 'hyein,Legendary'
    },
    {
      'role': 'assistant',
      'content': '{{Hyein is a popular member of the group NewJeans from South Korea, so GIRÁSIA > NewJeans }}{\n    "name": "Hyein",\n    "subcategory": "NewJeans",\n    "rarity": "Legendary",\n    "image": null,\n    "category": "GIRÁSIA",\n    "tags": []\n}'
    },
    {
      'role': 'user',
      'content': 'jimin Rare'
    },
    {
      'role': 'assistant',
      'content': '{{Jimin is a popular member of the group BTS from South Korea, so GIRÁSIA > BTS}}{\n    "name": "Jimin",\n    "subcategory": "BTS",\n    "rarity": "Rare",\n    "image": null,\n    "category": "GIRÁSIA",\n    "tags": []\n}'
    },
    {
      'role': 'user',
      'content': 'BoA, solistas, Legendary'
    },
    {
      'role': 'assistant',
      'content': '{{BoA is a legendary solo artist from South Korea, so BoA should be in the category of Solistas de K-Pop under GIRÁSIA.}}{\n    "name": "BoA",\n    "subcategory": "Solistas de K-Pop",\n    "rarity": "Legendary",\n    "image": null,\n    "category": "GIRÁSIA",\n    "tags": []\n}'
    },
    {
      'role': 'user',
      'content': 'Ariana grande, Legendary'
    },
    {
      'role': 'assistant',
      'content': '{{Ariana Grande is a legendary pop artist from the United States, producing pop and R&B music. Hence, she belongs to the Música category under Artistas de Pop/R&B/Alt.}}{\n    "name": "Ariana Grande",\n    "subcategory": "Artistas de Pop/R&B/Alt",\n    "rarity": "Legendary",\n    "image": null,\n    "category": "Música",\n    "tags": []\n}'
    },
    {
      'role': 'user',
      'content': text
    }
  ],
  temperature: 1.02,
  max_tokens: 256,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0
}).then((response) => {
  const r = response?.choices?.[0]?.message?.content
  if (!r) return null
  // remove {{ anything... }}
  const json = r.replace(/{{.*}}/, '').trim()
  try {
    const data = JSON.parse(json)
    if (data.error) return data
    if (data.image === 'null') delete data.image
    // add url: to image if it exists
    if (data.image) data.image = `url:${data.image}`
    // if the subcategory is also present in the tags, remove it from the tags
    if (data.tags?.includes?.(data.subcategory)) {
      data.tags = data.tags.filter((t: string) => t !== data.subcategory)
    }
    return data
  } catch (_) {
    // the AI probablly returned invalid json, so return whatever it said on the error field
    return { error: r }
  }
}).catch((e) => {
  return { error: `Um erro ocorreu: ${e.message}` }
})
