import { mentionUser } from '../utilities/telegram.js'
import { BotContext } from '../types/context.js'
import { User } from 'telegraf/types.js'
import { error } from 'melchior'

export interface Change {
  id: 'ADIÇÃO_DE_CARD' | 'REMOÇÃO_DE_CARD' | 'EDIÇÃO_DE_CARD'
      | 'EDIÇÃO_DE_IMAGEM_DE_CARD' | 'EDIÇÃO_DE_IMAGEM_DE_SUBCATEGORIA'
      | 'CRIAÇÃO_DE_SUBCATEGORIA' | 'REMOÇÃO_DE_SUBCATEGORIA'
      | 'ADIÇÃO_DE_APELIDO_DE_SUBCATEGORIA'
      | 'BANIMENTO_DE_USUÁRIO' | 'DESBANIMENTO_DE_USUÁRIO'
      | 'CRIAÇÃO_DE_PAPEL_DE_PAREDE' | 'EDIÇÃO_DE_PAPEL_DE_PAREDE' | 'REMOÇÃO_DE_PAPEL_DE_PAREDE'
      | 'CRIAÇÃO_DE_STICKER' | 'EDIÇÃO_DE_STICKER' | 'REMOÇÃO_DE_STICKER'
      | 'RENOVAÇÃO_DE_ASSINATURA' | 'CANCELAMENTO_DE_ASSINATURA' | 'CRIAÇÃO_DE_ASSINATURA' | 'FALHA_NA_RENOVAÇÃO_DA_ASSINATURA'
  user: { giraeID: number, tgID: string, name: string }
  object: { cardID: number, name: string, rarityName: string, categoryEmoji: string }
    | { subcategoryID: number, name: string, categoryEmoji: string }
    | { backgroundImageID: number, name: string }
    | { stickerID: number, name: string }
    | { tgID: string, name: string, giraeID: number }
  change?: { field: string, oldValue: string, newValue: string } | { field: string, oldValue: string, newValue: string }[]
}

const formatObject = (object: Change['object']) => {
  if ('tgID' in object) {
    return `📝 <b>Usuário:</b> 👤 <code>${object.giraeID}</code>. ${mentionUser({ id: object.tgID, name: object.name })}`
  }
  if ('subcategoryID' in object) {
    return `📝 <b>Subcategoria:</b> ${object.categoryEmoji} <code>${object.subcategoryID}</code>. ${object.name}`
  }
  if ('backgroundImageID' in object) {
    return `📝 <b>Papel de Parede:</b> 🖼️ <code>${object.backgroundImageID}</code>. ${object.name}`
  }
  if ('stickerID' in object) {
    return `📝 <b>Sticker:</b> 🎟️ <code>${object.stickerID}</code>. ${object.name}`
  }

  return `📝 <b>Card:</b> ${object.categoryEmoji} <code>${object.cardID}</code>. ${object.name} (${object.rarityName})`
}

export const reportWithContext = async (ctx: BotContext | null, id: Change['id'], object: Change['object'] | User, change?: Change['change']) => {
  const user = ctx ? { giraeID: ctx.userData.id.toString(), tgID: ctx.from!.id.toString(), name: ctx.from!.first_name } : { giraeID: 1983, tgID: _brklyn.botInfo?.id, name: 'Giraê' }
  let fixedObj = object

  // @ts-ignore
  if (object.first_name) {
    object = object as unknown as User
    // @ts-ignore
    fixedObj = { tgID: object.id.toString(), name: object.first_name, giraeID: await _brklyn.db.user.findUnique({ where: { tgId: object.id } }).then(u => u!.id.toString()) }
  }

  const changeObj = {
    id,
    user,
    object: fixedObj as Change['object'],
    change
  }

  await registerChange(changeObj as unknown as Change)
}

const forbiddenFields = ['id', 'createdAt', 'updatedAt']
export const calculateChangesBetweenObjects = (oldObject: Object, newObject: Object) => {
  const changes: { field: string, oldValue: string, newValue: string }[] = []
  for (const key in oldObject) {
    if (oldObject[key] !== newObject[key] && oldObject[key] !== undefined && newObject[key] !== undefined && !forbiddenFields.includes(key)) {
      // if the oldObject is an object, check if it has a name property. if so, use it as the old value
      if (typeof oldObject[key] === 'object' && oldObject[key].name) {
        if (oldObject[key].name !== newObject[key]) changes.push({ field: key, oldValue: oldObject[key].name, newValue: newObject[key] })
      } else changes.push({ field: key, oldValue: oldObject[key], newValue: newObject[key] })
    }
  }

  return changes
}

const generateChangeProperty = (change: Change['change']) => {
  if (!change) return ''
  if (!Array.isArray(change)) return `🔄 <b>Alteração:</b> ${change.field} de <code>${change.oldValue}</code> para <code>${change.newValue}</code>\n`
  return change.map(c => `🔄 <b>Alteração:</b> ${c.field} de <code>${c.oldValue}</code> para <code>${c.newValue}</code>`).join('\n')
}

export const registerChange = async (change: Change) => {
  const { id, user, object } = change
  const { giraeID, tgID, name } = user

  const reportChannel = process.env.LOGGING_CHANNEL_ID!.startsWith('-100') ? parseInt(process.env.LOGGING_CHANNEL_ID!)! : process.env.LOGGING_CHANNEL_ID!
  const report = `✏️ #${id}
👤 <b>Autor:</b> ${mentionUser({ id: tgID, name })} (GID: <code>${giraeID}</code>)
${formatObject(object)}
${generateChangeProperty(change.change)}
🕒 <i>${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</i>`

  return _brklyn.telegram.sendMessage(reportChannel, report, { parse_mode: 'HTML' }).catch((e) => {
    error('reporting', `error while sending report: ${e.stack}`)
    return false
  })
}
