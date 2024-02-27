export const generate = (text: string) => _brklyn.ai.chat.completions.create({
  model: "gpt-3.5-turbo-0125",
  messages: [
    {
      "role": "system",
      "content": "Your job is to comprehend text that contains information about collectable cards. Those cards contain 4 main properties: their name, their subcategory, their rarity, and an image (which is optional).\n\nTheir name is what you would expect. For artists, the name is their stage name. Valid names are Pabllo Vittar, Aghata Nunes, Seulgi, Shinji Ikari, Donald Trump, Lady Gaga, pinkpantheress, Pink Panther, etc.\nTheir subcategory depends on what the card is about. If it is a fictional character belonging to an anime, movie or series, it is the content's name. Therefore, Shinji Ikari it would be Neon Genesis Evangelion, for Donald Trump it would be Donald Trump, etc.\nTheir rarity is normally contained within the text in a random place, in portuguese. Therefore, if a text includes the word Lendário, the rarity is Legendary. If it contains Comum, it is common. If it contains Raro, it is rare. If it is anything else or you can't determine it, just assume it is common.\nThe image is a URL that may or may be not contained within the message. If you find an URL, assume it is the image. If you can't find anything, assume it is \"null\".\nAlso add another property: the category. If the cards refers to a music artist, the category is Música. If they refer to an anime, manga or any other japanese visual arts, consider it as Animangá. If it is about a game, the category is Jogos. If it refers to a show, movie or series, it is TV. If it is about anything else or you can't determine it, mark it as Variedades. Streamers, digital influencers and anything else that isn't marked should be considered as Variedades. QSMP, for an example, should be marked as Variedades (subcategory Streamers de Jogos)\nAlso add an array called tags. Tags should contain any useful data pertaining to the card (e.g., the girlgroup the singer's in, the movie a character's in,  the show the character's in, etc). Anything that is important to identify said card should be included.\n\nYou have to answer everything in the JSON format.\n\nIf you find that the character name or the content name is mispelled, fix it. Inproper casing, such as no caps is always considered an error.\n\nSubcategories will always be a show/movie/series name for TV or the anime/manga name for Animangá. If you notice the card refers to a music artist, check if the artist is in a group (k-pop girlgroup, boygroup, j-pop girlgroup, etc). The subcategory should be what genre they produce. Lady Gaga should say \"Artistas de Pop/R&B\". Erykah Badu should say \"Artistas de neo-soul\". Red Velvet members (Seulgi, Wendy, Joy, Yeri. Irene) should say \"Girlgroups de K-pop\".\nThere are exceptions: if the category is Variedades, the subcategory should be their occupation. For an example, Charlie D'Amelio should be Influenciadores Digitais. Aghata Nunes should be Influenciadores Digitais. Neymar should be Jogadores de futebol. Erika Hilton should Be Políticos. Lula should be Políticos. Henrietta Lacks should be Ciências. César Lattes should be Ciências.\nIf the category is TV, the subcategory should be Séries, FIlmes, Dorama and Novela, depending on what type of media the character is in. For an example, Serena van der Woodsen should say Séries. Capitão América should say FIlmes. Sueli should say Novelas. And others.\n\nErrors will cost my life. Don't kill me please. Before answering the JSON, add your thought process between {{ }} at the beginning of the response. It should say something like van der Woodsen is a character of Gossip GIrl, which is a TV show, so TV > Séries. Make the dexcription short and DO NOT ADD TEXT ANYWHERE ELSE OR MY FAMILY DIES. The JSON doesn't have to be pretty-printed. The explanation should not exceed 10 words. Answer in JSON ALWAYS!"
    },
    {
      "role": "user",
      "content": "serena van der woodsen, lendária, gossip girl (série de tv) https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS-PeDHnb0aYghQYfqJ-oh4wO3TKMhGyoWVZy5Z5kJ6fvNFt9EZKq1dpVE&s=10"
    },
    {
      "role": "assistant",
      "content": "{{van der Woodsen is a character of Gossip Girl, which is a TV show, so TV > Séries.}}\n{\n  \"name\": \"Serena van der Woodsen\",\n  \"subcategory\": \"Séries\",\n  \"rarity\": \"Legendary\",\n  \"image\": \"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS-PeDHnb0aYghQYfqJ-oh4wO3TKMhGyoWVZy5Z5kJ6fvNFt9EZKq1dpVE&s=10\",\n  \"category\": \"TV\",\n  \"tags\": [\"Gossip Girl\"]\n}"
    },
    {
      "role": "user",
      "content": "Presto, raro, TV\nhttps://brandedinthe80s.com/6790/cartoon-commentary-14-presto-the-giant-killer"
    },
    {
      "role": "assistant",
      "content": "{{Presto is a character from the TV series Dungeons & Dragons, so TV > Séries.}}\n{\n  \"name\": \"Presto\",\n  \"subcategory\": \"Séries\",\n  \"rarity\": \"Rare\",\n  \"image\": \"https://brandedinthe80s.com/6790/cartoon-commentary-14-presto-the-giant-killer\",\n  \"category\": \"TV\",\n  \"tags\": [\"Dungeons & Dragons\"]\n}"
    },
    {
      "role": "user",
      "content": "Philza, QSMP\nhttps://pin.it/2bDLA4aOo"
    },
    {
      "role": "assistant",
      "content": "{{Philza is a streamer of games, so Variedades > Streamers de Jogos.}}\n{\n  \"name\": \"Philza\",\n  \"subcategory\": \"Streamers de Jogos\",\n  \"rarity\": \"Common\",\n  \"image\": \"https://pin.it/2bDLA4aOo\",\n  \"category\": \"Variedades\",\n  \"tags\": [\"Gamer\", \"Minecraft\"]\n}"
    },
    {
      "role": "user",
      "content": "Carminha, lendária, Personagens da Teledramaturgia brasileira\nhttps://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQTz1-TfA4cNMYkNoktravO7e6Cghuzym5O_B9hYQzq0DOdMpAPMO4Mm5w&s=10"
    },
    {
      "role": "assistant",
      "content": "{{Carminha is a character from the Brazilian telenovela \"Avenida Brasil,\" so TV > Novela.}}\n{\n  \"name\": \"Carminha\",\n  \"subcategory\": \"Novela\",\n  \"rarity\": \"Legendary\",\n  \"image\": \"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQTz1-TfA4cNMYkNoktravO7e6Cghuzym5O_B9hYQzq0DOdMpAPMO4Mm5w&s=10\",\n  \"category\": \"TV\",\n  \"tags\": [\"Avenida Brasil\"]\n}"
    },
    {
      "role": "user",
      "content": "Gerard way, raro, my chemical romance (música)"
    },
    {
      "role": "assistant",
      "content": "{{Gerard Way is a member of the band My Chemical Romance, so Música > Rock/Gothic Rock.}}\n{\n  \"name\": \"Gerard Way\",\n  \"subcategory\": \"Artistas de Rock\",\n  \"rarity\": \"Rare\",\n  \"image\": \"null\",\n  \"category\": \"Música\",\n  \"tags\": [\"My Chemical Romance\"]\n}"
    },
    {
      "role": "user",
      "content": "Prince, lendário, Solista pop (música)"
    },
    {
      "role": "assistant",
      "content": "{{Prince is a pop solo artist, so Música > Pop.}}\n{\n  \"name\": \"Prince\",\n  \"subcategory\": \"Artistas de Pop\",\n  \"rarity\": \"Legendary\",\n  \"image\": \"null\",\n  \"category\": \"Música\",\n  \"tags\": []\n}"
    },
    {
      "role": "user",
      "content": "nunew chawarin, comum, atores tailandeses"
    },
    {
      "role": "assistant",
      "content": "{{Nunew Chawarin is a Thai actor, so Variedades > Atores tailandeses.}}\n{\n  \"name\": \"Nunew Chawarin\",\n  \"subcategory\": \"Atores tailandeses\",\n  \"rarity\": \"Common\",\n  \"image\": \"null\",\n  \"category\": \"Variedades\",\n  \"tags\": []\n}"
    },
    {
      "role": "user",
      "content": text
    }
  ],
  temperature: 1,
  max_tokens: 256,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
}).then((response) => {
  const r = response.choices[0].message.content
  if (!r) return null
  // remove {{ anything... }}
  const json = r.replace(/{{.*}}/, '').trim()
  return JSON.parse(json)
})
