const jwt = require('jsonwebtoken')

const SECRET_KEY = 'shhdonttellanyone' // For the love of all, do not use this secret in prod hahaha

export const generateLoginToken = (userID: string, username: string) => {
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 2)
  const token = {
    userID,
    username,
    generatedAt: Date.now(),
    expiresAt,
  }
  return jwt.sign(token, SECRET_KEY)
}

export const verifyToken = (token: string) => {
  return jwt.verify(token, SECRET_KEY)
}
