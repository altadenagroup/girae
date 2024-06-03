import { LastClient } from '@musicorum/lastfm'

export class LastFMController {
  client = new LastClient(process.env.FM_API_KEY!)

  async getHowManyTimesUserScrobbledAlbum (user: string, album: string, artist: string) {
    const cached = await _brklyn.cache.get('fm-user-album-pc', `${user}:${album}:${artist}`)
    if (cached) return cached

    const data = await this.client.album.getInfo(album, artist, { username: user }).catch(() => null)
    if (!data?.user?.playCount) return 0
    await _brklyn.cache.setexp('fm-user-album-pc', `${user}:${album}:${artist}`, data.user.playCount, 4 * 60)
    return data.user.playCount
  }

  async getHowManyTimesUserScrobbledArtist (user: string, artist: string) {
    const cached = await _brklyn.cache.get('fm-user-artist-pc', `${user}:${artist}`)
    if (cached) return cached

    const data = await this.client.artist.getInfo(artist, { username: user }).catch(() => null)
    if (!data?.user?.playCount) return 0
    await _brklyn.cache.setexp('fm-user-artist-pc', `${user}:${artist}`, data.user.playCount, 4 * 60)
    return data.user.playCount
  }

  async getHowManyTimesUserScrobbledTrack (user: string, track: string, artist: string) {
    const cached = await _brklyn.cache.get('fm-user-track-pc', `${user}:${track}:${artist}`)
    if (cached) return cached

    const data = await this.client.track.getInfo(track, artist, { username: user }).catch(() => null)
    if (!data?.user?.playCount) return 0
    await _brklyn.cache.setexp('fm-user-track-pc', `${user}:${track}:${artist}`, data.user.playCount, 4 * 60)
    return data.user.playCount
  }

  async getHowManyTimesUserHasScrobbled (type: 'album' | 'artist' | 'track', user: string, name: string, artist: string = '') {
    switch (type) {
      case 'album':
        return this.getHowManyTimesUserScrobbledAlbum(user, name, artist)
      case 'artist':
        return this.getHowManyTimesUserScrobbledArtist(user, name)
      case 'track':
        return this.getHowManyTimesUserScrobbledTrack(user, name, artist)
    }
  }

  async getFmUser (user: string) {
    return this.client.user.getInfo(user)
      .catch(() => null)
  }

  async getLastScrobble (user: string) {
    return this.client.user.getRecentTracks(user, { limit: 1 })
    .then((tracks) => {
      if (!tracks?.tracks?.[0]) return null
      const last = tracks.tracks[0]
      return {
        artistName: last.artist.name,
        trackName: last.name,
        imageURL: last.images?.[(last.images?.length || 1) - 1]?.url,
        albumName: last.album?.name
      }
    })
    .catch(() => null)
  }
}
