'use strict'

import { generateLoginToken, verifyToken } from './utils/jwt'
import * as AWS from 'aws-sdk'
const dynamodb = new AWS.DynamoDB()

export const handler = async (event: any, _: any, callback: any) => {
  // Use jwt decode here
  console.log('AUTHING')
  let token: any = {}
  try {
    token = verifyToken(event.authorizationToken)
  } catch (e) {
    callback(null, generatePolicy('user', 'Deny', event.methodArn))
  }

  // validate user deets too
  const params = {
    TableName: 'Users',
    Key: {
      UserId: {
        S: token.userID,
      },
    },
  }
  const userDetails = await new Promise<any>((res, rej) =>
    dynamodb.getItem(params, function (err, data) {
      if (err) {
        console.log(err, err.stack)
        rej(err)
      } else {
        const username = data.Item.Username.S
        const userId = data.Item.UserId.S
        const earliestTokenDate = data.Item.CertificateAgeLimit.N
        // Now no other lambda will need to access the users table.
        res({
          username,
          userId,
          earliestTokenDate,
        })
      }
    })
  )

  if (!userDetails || userDetails.earliestTokenDate > token.generatedAt) {
    // TODO: Also add a check for token expiry.
    callback(null, generatePolicy('user', 'Deny', event.methodArn))
  } else {
    // Add a new token here with a more recent expiry for the frontend to use if it wants
    const newToken = generateLoginToken(userDetails.userId, userDetails.username)
    callback(
      null,
      generatePolicy('user', 'Allow', event.methodArn, {
        ...token,
        ...userDetails,
        newToken,
      })
    )
  }
}

// Help function to generate an IAM policy
const generatePolicy = function (principalId: string, effect: string, resource: string, token?: string) {
  const authResponse: any = {}

  authResponse.principalId = principalId
  if (effect && resource) {
    const policyDocument: any = {}
    policyDocument.Version = '2012-10-17'
    policyDocument.Statement = []
    const statementOne: any = {}
    statementOne.Action = 'execute-api:Invoke'
    statementOne.Effect = effect
    statementOne.Resource = resource
    policyDocument.Statement[0] = statementOne
    authResponse.policyDocument = policyDocument
  }

  // Optional output with custom properties of the String, Number or Boolean type.
  authResponse.context = token || {}
  return authResponse
}
