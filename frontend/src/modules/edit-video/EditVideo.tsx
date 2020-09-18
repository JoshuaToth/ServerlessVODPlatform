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
  const [uploading, setUploading] = useState(false)
  const [fileUploaded, setFileUploaded] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('Loading...')
  const [uploadStatus, setUploadedStatus] = useState('N/A')

  const UploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : undefined
    if (!file || uploading) return
    setUploading(true)
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
        setUploading(false)
        setMessage('Failed to get upload location')
      })

    new Promise((resolve, reject) => {
      const formData = new FormData()
      Object.keys(uploadResult.fields).forEach((key) => {
        formData.append(key, uploadResult.fields[key])
      })

      formData.append('file', file)
      const xhr = new XMLHttpRequest()
      xhr.open('POST', uploadResult.url, true)
      xhr.upload.onprogress = (e) => setProgress(Math.round((e.loaded / e.total) * 100))
      xhr.send(formData)
      xhr.onload = function () {
        this.status === 204 ? resolve() : reject('BOOM')
      }
    })
      .then(() => {
        console.log('Uploaded!')
        setUploading(false)
        setFileUploaded(true)
        setUploadedStatus('UPLOAD PENDING')
      })
      .catch((e) => {
        console.log('upload failed', e)
        setUploading(false)
        setMessage('File upload failed')
      })
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
        setStatus(video.Status)
        setUploadedStatus(video.UploadStatus)
        setFileUploaded(video.UploadStatus !== 'N/A')
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
        <p>Status: {status}</p>
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
        {uploading ? (
          <p>Uploading file... {progress}%</p>
        ) : fileUploaded ? (
          <p>File uploaded! Current file status: {uploadStatus}</p>
        ) : (
          <input type="file" name="file" onChange={(e) => UploadVideo(e)} />
        )}
        <button type="submit" disabled={saving}>
          Save changes
        </button>
      </form>
    </div>
  )
}
