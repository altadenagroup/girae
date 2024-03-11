import { ChatMember, User } from "telegraf/types"
import { BotContext } from "../types/context.js"

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
  return `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file.file_path}`
}

export const determineMethodToSendMedia = (link: string) => {
    // remove query parameters
    link = link.split('?')[0]
    // if it is an animation (.gif, .gifv), use replyWithAnimation
    if (link.endsWith('.gif') || link.endsWith('.gifv')) return 'replyWithAnimation'
    // if it is an image, use replyWithPhoto
    if (link.endsWith('.png') || link.endsWith('.jpg') || link.endsWith('.jpeg')) return 'replyWithPhoto'
    // if it is a video, use replyWithVideo
    if (link.endsWith('.mp4')) return 'replyWithVideo'
    // if it is a sticker, use replyWithSticker
    if (link.endsWith('.webp')) return 'replyWithSticker'

    return 'replyWithPhoto'
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

export const mentionUser = (user: User) => {
  return `<a href="tg://user?id=${user.id}">${user.first_name}</a>`
}

export const launchStartURL = (commandName: string, args: string) => {
  return `https://t.me/${_brklyn.botInfo!.username}?start=${commandName}-${args}`
}


export const escapeHTML = (text: string) => {
  return text.replaceAll(/</g, '&lt;')
  .replaceAll(/>/g, '&gt;')
}
