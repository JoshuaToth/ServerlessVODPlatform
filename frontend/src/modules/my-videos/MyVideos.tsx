import React, { useEffect, useState } from 'react'
import axios from 'axios'
// import styles from './Login.module.css'
import { CREATORS_URL } from '../../utils/consts'
import styles from './MyVideos.module.css'

export const MyVideos: React.FC<{
  sessionToken: string
  setVideoID: (id: string) => void
}> = ({ sessionToken, setVideoID }) => {
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [makingNewVideo, setMakingNewVideo] = useState(false)
  const createNewVideo = () => {
    setMakingNewVideo(true)
    axios
      .post(CREATORS_URL + '/video', {}, { headers: { Authorization: sessionToken } })
      .then((response) => {
        setVideoID(response.data.videoId)
        setMakingNewVideo(false)
      })
      .catch((e) => {
        setMakingNewVideo(false)
        console.log(e)
      })
  }

  useEffect(() => {
    axios
      .get(CREATORS_URL + '/videos', { headers: { Authorization: sessionToken } })
      .then(function (response) {
        setVideos(response.data.items)
        setLoading(false)
      })
      .catch(function (error) {
        console.log(error)
      })
  }, [])

  return (
    <div>
      <p>My videos</p>
      <button onClick={createNewVideo} disabled={makingNewVideo}>
        Create new video
      </button>
      {loading ? <p>Loading your videos...</p> : null}
      {videos.map((video) => (
        <div key={video.VideoId} className={styles.video}>
          <div className={styles.label}>
            <p>Title:</p>
            <p>{video.Title}</p>
          </div>

          <div className={styles.label}>
            <p>Status:</p>
            <p>{video.VideoStatus}</p>
          </div>
          <button onClick={(e) => setVideoID(video.VideoId)}>edit</button>
        </div>
      ))}
    </div>
  )
}
