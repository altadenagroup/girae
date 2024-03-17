import { User, UserProfile } from '@prisma/client'
import { Context } from 'melchior'
import ResponseSystem from '../utilities/responses.js'
import { ES2Methods } from '../sessions/manager.js'
import { User as TelegrafUser } from 'telegraf/types'

export interface BotContext extends Context {
  userData: User
  profileData: UserProfile
  args: string[]
  responses: ResponseSystem
  ogReply: (text: string, extra?: any) => Promise<any>
  ogReplyWithPhoto: (photo: any, extra?: any) => Promise<any>
  es2: ES2Methods
  from: TelegrafUser & { raw_first_name: string }
}
