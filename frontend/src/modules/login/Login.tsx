import React, { useState } from 'react'
import axios from 'axios'
import styles from './Login.module.css'
import { USERS_URL } from '../../utils/consts'

export const Login: React.FC<{ setUserDetails: (details: any) => void }> = ({
  setUserDetails,
}) => {
  const [email, setEmail] = useState('yourcustomemail@gmail.com')
  const [password, setPassword] = useState('!CoolPassw0Rd')
  const [username, setUsername] = useState('1337Gmr')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const SignupLogin = (action: '/login' | '/signup') => {
    setMessage(`Currently using the ${action} endpoint`)
    setLoading(true)

    axios
      .post(USERS_URL + action, {
        email: email,
        password: password,
        username: username,
      })
      .then(function (response) {
        setLoading(false)
        if (response.data.message) {
          setMessage(response.data.message)
        } else if (response.data.session) {
          setMessage('')
          setUserDetails(response.data)
        } else if (response.data.username) {
          setMessage('User signed up!')
        } else {
          setMessage(JSON.stringify(response.data))
        }
      })
      .catch(function (error) {
        console.log(error)
        setMessage('Failed to log in user. User may not be approved yet')
      })
  }

  return (
    <div>
      <p>{message}</p>
      {loading ? (
        'Loading...'
      ) : (
        <div className={styles.formWrapper}>
          <h2>Sign up / Log in</h2>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          <button onClick={() => SignupLogin('/signup')}>Sign up</button>
          <button onClick={() => SignupLogin('/login')}>Log in</button>
        </div>
      )}
    </div>
  )
}
