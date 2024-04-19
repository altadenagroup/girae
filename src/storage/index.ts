import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { readFile } from 'node:fs/promises'

export class S3Storage {
  #client: S3Client
  #bucket: string

  constructor (bucket: string) {
    this.#client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
      }
    })

    this.#bucket = bucket
  }

  async putObject (key: string, body: string | Buffer | Uint8Array | Blob) {
    const command = new PutObjectCommand({
      Bucket: this.#bucket,
      Key: key,
      Body: body
    })

    return this.#client.send(command)
  }

  async getObject (key: string) {
    const command = new GetObjectCommand({
      Bucket: this.#bucket,
      Key: key
    })

    return this.#client.send(command)
  }

  async deleteObject (key: string) {
    const command = new DeleteObjectCommand({
      Bucket: this.#bucket,
      Key: key
    })

    return this.#client.send(command)
  }

  // uploads a file from a url to the bucket
  async uploadFileFromUrl (key: string, url: string) {
    // if the url starts with tg:, it's a local file, so we have to read it and put the buffer
    if (url.startsWith('tg:')) {
      const file = await readFile(url.slice(3))
      return this.putObject(key, file)
    }

    const response = await fetch(url)
    const buffer = await response.arrayBuffer()
    // @ts-ignore
    return this.putObject(key, buffer)
  }

  // gets the read-only url for an object, valid for 12 months
  async getReadOnlyUrl (key: string) {
    const command = new GetObjectCommand({
      Bucket: this.#bucket,
      Key: key
    })

    return getSignedUrl(this.#client, command, { expiresIn: 60 * 60 * 24 * 365 })
  }
}
