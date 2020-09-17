import React, { useEffect, useState } from 'react'
import axios from 'axios'
// import styles from './Login.module.css'
import { CREATORS_URL } from '../../utils/consts'
import styles from './EditVideo.module.css'

export const EditVideo: React.FC<{
  sessionToken: string
  videoId: string
  setVideoID: (id?: string) => void
}> = ({ sessionToken, videoId, setVideoID }) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const SaveVideo = (event: React.FormEvent<HTMLFormElement>) => {
    if (saving) return
    event.preventDefault()
    setSaving(true)
    setMessage('Saving')
    axios
      .put(
        CREATORS_URL + '/video',
        {
          videoId: videoId,
          title: title,
          content: {
            description: description,
            tags: ['cats', 'kitty'],
          },
        },
        { headers: { Authorization: sessionToken } }
      )
      .then(function (response) {
        setSaving(false)
        setMessage('Saved')
      })
      .catch(function (error) {
        setSaving(false)
        setMessage('ERROR SAVING')
        console.log(error)
      })
  }

  useEffect(() => {
    if (!videoId) return
    setLoading(true)
    axios
      .get(CREATORS_URL + '/video/' + videoId, {
        headers: { Authorization: sessionToken },
      })
      .then(function (response) {
        const video = response.data.video
        setTitle(video.Title)
        setDescription(video.Details.description)
        setLoading(false)
      })
      .catch(function (error) {
        console.log(error)
      })
  }, [videoId])

  return loading ? (
    <div>Loading video...</div>
  ) : (
    <div>
      <button onClick={(e) => setVideoID()}>return</button>
      <p>{message}</p>
      <form onSubmit={SaveVideo} className={styles.videoForm}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
        />
        <textarea
          rows={5}
          cols={50}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
        />
        <p>Upload video</p>
        <input type="file" name="file" />
        <button type="submit" disabled={saving}>
          Save changes
        </button>
      </form>
    </div>
  )
}
