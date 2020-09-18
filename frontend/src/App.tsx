import React, { useState } from 'react'
import './App.css'
import { Login } from './modules/login/Login'
import { MyVideos } from './modules/my-videos/MyVideos'
import { EditVideo } from './modules/edit-video/EditVideo'
import { ViewVideos } from './modules/view-videos/ViewVideos'

const App = () => {
  const [userDetails, setUserDetails] = useState<
    { username: string; session: string } | undefined
  >()

  const [creatorMode, setCreatorMode] = useState(true)

  const [videoID, setVideoID] = useState<string | undefined>()

  // could put session into a provider so it doesn't have to be passed around maybe
  return (
    <div className="App">
      <header className="App-header">
        <div>
          <p>Switch Mode:</p>
          <button onClick={() => setCreatorMode(!creatorMode)}>
            {creatorMode ? 'Viewer' : 'Creator'}
          </button>
        </div>
        {creatorMode ? (
          <div>
            {!userDetails ? (
              <div>
                <h1>'Valvid, best gaming videos on the web!'</h1>
                <Login setUserDetails={setUserDetails} />
              </div>
            ) : (
              <div>
                <h1>Welcome {userDetails.username} :)</h1>
                {videoID ? (
                  <EditVideo
                    sessionToken={userDetails.session}
                    videoId={videoID}
                    setVideoID={setVideoID}
                  />
                ) : (
                  <MyVideos sessionToken={userDetails.session} setVideoID={setVideoID} />
                )}
              </div>
            )}{' '}
          </div>
        ) : (
          <div>
            <h1>'Valvid, best gaming videos on the web!'</h1>
            <ViewVideos />
          </div>
        )}
      </header>
    </div>
  )
}

export default App
