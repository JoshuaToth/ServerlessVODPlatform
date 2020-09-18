import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { VIEWERS_URL } from '../../utils/consts'
import styles from './ViewVideos.module.css'

export const ViewVideos = () => {
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [makingNewVideo, setMakingNewVideo] = useState(false)

  useEffect(() => {
    axios
      .get(VIEWERS_URL + '/videos')
      .then(function (response) {
        setVideos(response.data.videos)
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
      <div className={styles.videosWrapper}>
      {videos.map((video) => (
        <div key={video.VideoId} className={styles.video}>
          <div className={styles.label}>
            <p>Title:</p>
            <p>{video.videoTitle}</p>
          </div>
          <video width="320" height="240" controls>
            <source src={video.videoUrl} type="video/mp4" />
          </video>
        </div>
      ))}
      </div>
    </div>
  )
}
