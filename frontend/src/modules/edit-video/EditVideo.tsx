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

  const UploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : undefined
    if (!file) return
    console.log(file)
    const uploadResult = await axios
      .post(
        CREATORS_URL + '/video/upload',
        {
          videoId,
          type: file.type,
          size: file.size,
          videoName: file.name,
        },
        {
          headers: { Authorization: sessionToken },
        }
      )
      .then(function (response) {
        return response.data.postData
      })
      .catch(function (error) {
        console.log(error)
      })
    console.log('uploading file', uploadResult)

    new Promise((resolve, reject) => {
      const formData = new FormData()
      Object.keys(uploadResult.fields).forEach((key) => {
        formData.append(key, uploadResult.fields[key])
      })

      // Actual file has to be appended last.
      formData.append('file', file)
      console.log('uploading file')
      const xhr = new XMLHttpRequest()
      xhr.open('POST', uploadResult.url, true)
      xhr.send(formData)
      xhr.onload = function () {
        this.status === 204 ? resolve() : reject('BOOM')
      }
    })
      .then(() => {
        console.log('Uploaded!')
      })
      .catch((e) => {
        console.log('upload failed', e)
      })
    // axios
    //   .post(
    //     url,
    //     {
    //       videoId,
    //       ...uploadResult.fields,
    //       file
    //     }
    //   )
    //   .then(function (response) {
    //     console.log('file uploaded')
    //     return response.data
    //   })
    //   .catch(function (error) {
    //     console.log('upload failed', error)
    //     console.log(error)
    //   })
  }

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
        <input type="file" name="file" onChange={(e) => UploadVideo(e)} />
        <button type="submit" disabled={saving}>
          Save changes
        </button>
      </form>
    </div>
  )
}
