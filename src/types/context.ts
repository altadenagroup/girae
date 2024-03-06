import { User, UserProfile } from '@prisma/client'
import { Context } from 'melchior'
import ResponseSystem from '../utilities/responses.js'

export interface BotContext extends Context {
    userData: User
    profileData: UserProfile
    args: string[]
    responses: ResponseSystem
    ogReply: (text: string, extra?: any) => Promise<any>
    ogReplyWithPhoto: (photo: any, extra?: any) => Promise<any>
}
