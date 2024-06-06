import { BotContext } from '../types/context.js'
import { cdnItemURL, generateFileName, uploadAttachedPhoto } from '../utilities/telegram.js'

const determineMimeByURLEnding = (url: string) => {
  if (url.endsWith('.gif') || url.endsWith('.gifv')) return 'image/gif'
  if (url.endsWith('.mp4')) return 'video/mp4'
  return 'image/jpeg'
}

export default async (ctx: BotContext) => {
  const url = ctx.args[0]
  if (url) {
    // check if url is valid
    if (!url.startsWith('http')) {
      return ctx.reply('URL inválida.')
    }

    const name = generateFileName(determineMimeByURLEnding(url))
    const t = await _brklyn.images.uploadFileFromUrl(name, url).catch(async () => {
      return false
    })

    if (!t) {
      return ctx.reply('Erro ao fazer upload da imagem.')
    }

    return ctx.replyWithHTML(`Upload realizado com sucesso. Para usar esta imagem no bot, use o seguinte texto:\n<code>url:${cdnItemURL(name)}</code>`)
  }


  const imgString = await uploadAttachedPhoto(ctx, true)
  if (!imgString) return

  return ctx.replyWithHTML(`Upload realizado com sucesso. Para usar esta imagem no bot, use o seguinte texto:\n<code>${imgString}</code>`)
}

export const info = {
  guards: ['isAdmin']
}
