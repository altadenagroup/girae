import { error } from 'melchior'
import ResponseSystem from '../utilities/responses.js'

export default async (ctx, next) => {
  if (ctx.from) {
    // register user name and username to namekeeping cache
    _brklyn.cache.set('namekeeper', ctx.from.id.toString(), {
      ...ctx.from
    }).then(() => 0).catch(() => 0)
    if (ctx.from.username) _brklyn.cache.set('namekeeper_usernames', ctx.from.username, ctx.from.id.toString()).then(() => 0).catch(() => 0)

    ctx.userData = await _brklyn.db.user.findFirst({ where: { tgId: ctx.from.id } }).catch((err) => {
      error('middleware.userData', `could not find user: ${err}`)
      return {}
    })

    if (!ctx.userData) {
      ctx.userData = await _brklyn.db.user.create({
        data: {
          tgId: ctx.from.id
        }
      }).catch((err) => {
        error('middleware.userData', `could not create user: ${err}`)
        return {}
      })
    }

    ctx.profileData = await _brklyn.db.userProfile.findFirst({
      where: { userId: ctx.userData.id },
      include: { stickers: true, background: true }
    }).catch((err) => {
      error('middleware.userData', `could not find user profile: ${err}`)
      return {}
    })

    if (!ctx.profileData) {
      ctx.profileData = await _brklyn.db.userProfile.create({
        data: {
          userId: ctx.userData.id
        }
      }).catch((err) => {
        error('middleware.userData', `could not create user profile: ${err}`)
        return {}
      })
    }

    ctx.responses = new ResponseSystem(ctx)
  }

  return next()
}
