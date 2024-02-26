import { User, UserProfile } from '@prisma/client'
import { Context } from 'melchior'
import ResponseSystem from '../utilities/responses.js'

export interface BotContext extends Context {
    userData: User
    profileData: UserProfile
    args: string[]
    responses: ResponseSystem
}