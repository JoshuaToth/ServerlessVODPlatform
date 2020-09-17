'use strict'
const awsServerlessExpress = require('aws-serverless-express')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')

import * as express from 'express'
import * as bodyParser from 'body-parser'
import * as cors from 'cors'
import { v4 } from 'uuid'
import * as AWS from 'aws-sdk'
import * as AmazonCognitoIdentity from 'amazon-cognito-identity-js'
import { generateLoginToken } from './utils/jwt'

const dynamodb = new AWS.DynamoDB()

const app = express()
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(awsServerlessExpressMiddleware.eventContext())

const { COGNITO_POOL_ID, COGNITO_POOL_CLIENT_ID } = process.env
const poolData = {
  UserPoolId: COGNITO_POOL_ID,
  ClientId: COGNITO_POOL_CLIENT_ID,
}
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData)

app.get('/users/healthcheck', (req, res) => {
  res.json({ path: 'healthcheck', body: req.body, event: (req as any).apiGateway.event })
})

app.post('/users/signup', async (req, res) => {
  // Username should be validated and unique. It might be worth adding a secondary index to dynamo to do a search for it.
  const attributeList = []
  const userID = v4()
  attributeList.push(
    new AmazonCognitoIdentity.CognitoUserAttribute({
      Name: 'email',
      Value: req.body.email,
    })
  )
  attributeList.push(
    new AmazonCognitoIdentity.CognitoUserAttribute({
      Name: 'custom:userID',
      Value: userID,
    })
  )
  userPool.signUp(req.body.email, req.body.password, attributeList, null, function (
    err,
    result
  ) {
    if (err) {
      console.log(err)
      res.json(err)
      return
    }

    const params = {
      Item: {
        UserId: {
          S: userID,
        },
        EmailAddress: {
          S: req.body.email,
        },
        Username: {
          S: req.body.username, //obv check for this. Need a req validator anyway
        },
        SignupDate: {
          N: Date.now().toString(),
        },
        LastLogin: {
          N: Date.now().toString(),
        },
        AccountStatus: {
          S: 'PENDING',
        },
        CertificateAgeLimit: {
          N: Date.now().toString(),
        },
      },
      ReturnConsumedCapacity: 'TOTAL',
      TableName: 'Users',
    }
    dynamodb.putItem(params, function (err) {
      if (err) {
        console.log(err, err.stack)
        res.json(err)
      } else res.json({ path: 'signup', username: req.body.username })
    })
  })
})

app.post('/users/login', async (req, res) => {
  var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
    Username: req.body.email,
    Password: req.body.password,
  })

  var userData = {
    Username: req.body.email,
    Pool: userPool,
  }

  var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData)

  cognitoUser.authenticateUser(authenticationDetails, {
    onSuccess: function (result) {
      const UserID = result.getIdToken().decodePayload()['custom:userID']
      const params = {
        TableName: 'Users',
        Key: {
          UserId: {
            S: UserID,
          },
        },
      }
      dynamodb.getItem(params, function (err, data) {
        if (err) {
          console.log(err, err.stack)
          res.json(err)
        } else {
          const username = data.Item.Username.S
          res.json({
            path: 'login',
            session: generateLoginToken(UserID, username),
            username: username
          })
        }
      })
    },
    onFailure: function (err) {
      console.log(err)
      res.status(500).json(err)
    },
  })
})

const server = awsServerlessExpress.createServer(app)

export const handler = (event: any, context: any) => {
  awsServerlessExpress.proxy(server, event, context)
}
