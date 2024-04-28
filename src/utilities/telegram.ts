import { ChatMember, User } from 'telegraf/types'
import { BotContext } from '../types/context.js'
import { generateID } from './misc.js'
import { info } from 'melchior'
import { escapeForHTML } from './responses.js'


export const isUserOnNewsChannel = async (id: number) => {
  const cache = await _brklyn.cache.get('news', id.toString())
  if (cache === true) return true

  const member = await _brklyn.telegram.getChatMember(process.env.NEWS_CHANNEL_ID!, id).catch(() => ({ status: 'left' }))
  if (member.status === 'member' || member.status === 'creator' || member.status === 'administrator' || member.status === 'restricted') {
    await _brklyn.cache.setexp('news', id.toString(), true, 86400)
    return true
  } else {
    await _brklyn.cache.setexp('news', id.toString(), false, 60) // 1 minute just to avoid spamming the API
  }

  return false
}

export const cachedGetUserPhotoAndFile = async (id: number) => {
  const cache = await _brklyn.cache.get('user-photo', id.toString())
  if (cache) return cache

  const userPhotos = await _brklyn.telegram.getUserProfilePhotos(id, 0, 1).catch(() => null)
  if (!userPhotos || userPhotos.total_count === 0) return null
  const userPhoto = userPhotos.photos[0][1]
  const file = await _brklyn.telegram.getFile(userPhoto.file_id).catch(() => null)
  if (!file) return null

  await _brklyn.cache.setexp('user-photo', id.toString(), file, /* 5m */ 300)
  return file
}

export const generatePhotoLink = async (fileID: string) => {
  const file = await _brklyn.telegram.getFile(fileID).catch(() => null)
  if (!file) return null
  return `tg:${file.file_path}`
}

export const determineMethodToSendMedia = (link: string) => {
  // remove query parameters
  link = link.split('?')[0]
  // if it is an animation (.gif, .gifv), use replyWithAnimation
  if (link.endsWith('.gif') || link.endsWith('.gifv')) return 'replyWithAnimation'
  if (link.endsWith('.mp4')) return 'replyWithVideo'
  return 'replyWithPhoto'
}

export const determineMediaType = (link: string) => {
  // remove query parameters
  link = link.split('?')[0]
  // if it is an animation (.gif, .gifv), use replyWithAnimation
  if (link.endsWith('.gif') || link.endsWith('.gifv')) return 'animation'
  if (link.endsWith('.mp4')) return 'video'

  return 'photo'
}


export const getUserByMentionOrID = async (ctx: BotContext, mentionOrId: string): Promise<ChatMember | null> => {
  const cached = await _brklyn.cache.get('user-mention', mentionOrId)
  if (cached) return cached

  // if it doesnt start with @ and is not a number, it is invalid
  if (!mentionOrId.startsWith('@') && isNaN(Number(mentionOrId))) return null
  console.log(mentionOrId)
  const d = await ctx.telegram.getChatMember(ctx.chat!.id, mentionOrId as any).catch(() => null)
  if (d) {
    await _brklyn.cache.setexp('user-mention', mentionOrId, d, 86400)
    return d
  }

  return null
}

export const mentionUser = (user: User | { name: string, id: string }) => {
  // @ts-ignore
  if (user?.username) return `<a href="https://t.me/${user.username}">${escapeForHTML(user.first_name || user.name)}</a>`

  // @ts-ignore
  return `<a href="tg://user?id=${user.tgId || user.id}">${escapeForHTML(user.first_name || user.name)}</a>`
}

export const launchStartURL = (commandName: string, args: string) => {
  return `https://t.me/${_brklyn.botInfo!.username}?start=${commandName}-${args}`
}


export const escapeHTML = (text: string) => {
  return text.replaceAll(/</g, '&lt;')
    .replaceAll(/>/g, '&gt;')
}

export const getAvatarURL = (file) => file
  ? `tg:${file.file_path}`
  : 'https://placehold.co/300x300.png?text=sem+foto'

export const generateMessageLink = (chatID: number | string, messageID: number, threadId: number | undefined) => {
  // if the chatId is a string, it's a public group, so we have to drop the /c/ part
  if (typeof chatID === 'string') return `https://t.me/${chatID.replace('@', '')}/${threadId ? `${threadId}/` : ''}${messageID}`
  else if (chatID < 0) {
    // if it doesn't start with -100, just remove the -
    if (chatID.toString().startsWith('-') && !chatID.toString().startsWith('-100')) return `https://t.me/c/${chatID.toString().substring(1)}/${threadId ? `${threadId}/` : ''}${messageID}`
    return `https://t.me/c/${chatID.toString().substring(4)}/${threadId ? `${threadId}/` : ''}${messageID}`
  } else return `https://t.me/c/${chatID.toString().substring(4)}/${threadId ? `${threadId}/` : ''}${messageID}`
}

const mimeToExtension = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4'
}

// returns the telegram url for an attached photo
export const getAttachedPhotoURL = async (ctx: BotContext) => {
  // @ts-ignore
  const photos = ctx.message?.photo || ctx.message?.reply_to_message?.photo
  let photo = photos?.[0] ? photos[photos.length - 1].file_id : null
  // @ts-ignore
  const doc = ctx.message.document || ctx.message.reply_to_message?.document
  if (doc) photo = doc.file_id
  if (!photo) return null
  return await generatePhotoLink(photo)
}

export const uploadAttachedPhoto = async (ctx: BotContext, respond: boolean = true, onlyDocuments: boolean = false) => {
  // @ts-ignore
  const photos = ctx.message?.photo || ctx.message?.reply_to_message?.photo
  let photo = photos?.[0] ? photos[photos.length - 1] : null
  // @ts-ignore
  const doc = ctx.message.document || ctx.message.reply_to_message?.document
  if (onlyDocuments && (!doc || !(doc.mime_type?.startsWith('image') || doc.mime_type?.startsWith('video')))) {
    respond && await ctx.reply('Você precisa enviar uma foto como documento.')
    return false
  }
  if (doc && !photo) photo = doc
  if (!photo) {
    respond && await ctx.reply('Você precisa enviar uma foto.')
    return false
  }

  const link = await generatePhotoLink(photo.file_id)
  if (!link) {
    respond && await ctx.reply('Não foi possível obter o link da foto.')
    return false
  }
  const id = generateID(32)
  // upload with the correct extension
  let exts = mimeToExtension[photo.mime_type]
  if (!exts && photo.mime_type) {
    respond && await ctx.reply('Formato de imagem inválido.')
    return false
  }
  if (!exts) exts = 'jpg'
  const aa = await _brklyn.images.uploadFileFromUrl(`${id}.${exts}`, link).catch(async (e) => {
    respond && await ctx.reply('Erro ao fazer upload da imagem. Erro: '+ e.message)
    return false
  })

  info('storage', `uploaded image id ${id}.${exts}`)

  if (aa) return `url:https://s3.girae.altadena.space/${id}.${exts}`
  else return false
}

export const getTgUserFromText = async (text: string) => {
  if (text.startsWith('@')) {
    const userID = await _brklyn.cache.get('namekeeper_usernames', text.replace('@', ''))
    if (!userID) return null
    return _brklyn.cache.get('namekeeper', userID)
  } else if (!isNaN(Number(text))) {
    const data = await _brklyn.cache.get('namekeeper', text)

    if (!data) {
      const n = parseInt(text)
      const u = await _brklyn.db.user.findUnique({ where: { id: n } })
      if (u) return _brklyn.cache.get('namekeeper', u.tgId.toString())
    }

    return data
  }

  return null
}

export const getMentionedUser = async (ctx: BotContext, arg: string | undefined = undefined) => {
  if (arg) {
    const user = await getTgUserFromText(arg)
    if (user) return _brklyn.db.user.findUnique({ where: { tgId: user.id } })
  }

  // check if the message is a reply. if it is, get the user from the reply
  // @ts-ignore
  const reply = ctx.message.reply_to_message
  if (reply && reply.from && reply.from.id !== 777000) {
    return _brklyn.db.user.findUnique({ where: { tgId: reply.from.id } })
  }
  return ctx.userData
}

export const getMentionedTgUser = async (ctx: BotContext, arg: string | undefined = undefined) => {
  if (arg) {
    const user = await getTgUserFromText(arg)
    if (user) return user
  }
  // check if the message is a reply. if it is, get the user from the reply
  // @ts-ignore
  const reply = ctx.message.reply_to_message
  if (reply && reply.from && reply.from.id !== 777000) {
    return reply.from
  }
  return ctx.from
}

export const getUserFromNamekeeper = async (id: string) => {
  return _brklyn.cache.get('namekeeper', id)
}
