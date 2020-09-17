import React, { useState } from 'react'
import './App.css'
import { Login } from './modules/login/Login'
import { MyVideos } from './modules/my-videos/MyVideos'

const App = () => {
  const [userDetails, setUserDetails] = useState<
    { username: string; session: string } | undefined
  >()
  // could put session into a provider so it doesn't have to be passed around maybe
  return (
    <div className="App">
      <header className="App-header">
        {!userDetails ? (
          <div>
            <h1>'Valvid, best gaming videos on the web!'</h1>
            <Login setUserDetails={setUserDetails} />
          </div>
        ) : (
          <div>
            <h1>Welcome {userDetails.username} :)</h1>
            <MyVideos sessionToken={userDetails.session} />
          </div>
        )}
      </header>
    </div>
  )
}

export default App
