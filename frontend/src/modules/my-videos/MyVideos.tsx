import React, { useEffect, useState } from 'react'
import axios from 'axios'
// import styles from './Login.module.css'
import { CREATORS_URL } from '../../utils/consts'

export const MyVideos: React.FC<{ sessionToken: string }> = ({ sessionToken }) => {
  const [videos, setVideos] = useState<any[]>([])
  useEffect(() => {
    axios
      .get(CREATORS_URL + '/videos', { headers: { Authorization: sessionToken } })
      .then(function (response) {
        setVideos(response.data.items)
      })
      .catch(function (error) {
        console.log(error)
      })
  }, [])
  return (
    <div>
      <p>My videos</p>
      {videos.map((video) => (
        <div>
          <p>Title:</p>
          <p>{video.Title}</p>
          <p>Status:</p>
          <p>{video.Status}</p>
        </div>
      ))}
    </div>
  )
}
