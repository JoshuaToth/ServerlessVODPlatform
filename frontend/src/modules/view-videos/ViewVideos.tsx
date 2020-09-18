import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { VIEWERS_URL } from '../../utils/consts'
import styles from './ViewVideos.module.css'

export const ViewVideos: React.FC<{
  sessionToken: string
  setVideoID: (id: string) => void
}> = ({ sessionToken, setVideoID }) => {
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [makingNewVideo, setMakingNewVideo] = useState(false)

  useEffect(() => {
    axios
      .get(VIEWERS_URL + '/videos', { headers: { Authorization: sessionToken } })
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
      {loading ? <p>Loading the best videos on the web!...</p> : null}
      {videos.map((video) => (
        <div key={video.VideoId} className={styles.video}>
          <div className={styles.label}>
            <p>Title:</p>
            <p>{video.Title}</p>
          </div>

          <div className={styles.label}>
            <p>Status:</p>
            <p>{video.Status}</p>
          </div>
          <button onClick={(e) => setVideoID(video.VideoId)}>edit</button>
        </div>
      ))}
    </div>
  )
}
