'use strict'

const AWS = require('aws-sdk')

const docClient = new AWS.DynamoDB.DocumentClient()

const groupsTable = process.env.GROUPS_TABLE

exports.handler = async (event) => {
  console.log('Processing event: ', event)

  // TODO: Read and parse "limit" and "nextKey" parameters from query parameters
  let nextKey // Next key to continue scan operation if necessary
  let limit // Maximum number of elements to return

  // HINT: You might find the following method useful to get an incoming parameter value
  // getQueryParameter(event, 'param')
  try {
    limit = parseLimitParameter(event) || 20
    nextKey = parseNextKeyParameter(event)
  } catch (e){
    console.log('Failed to parse parameters: ', e.message)
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Invalid parameters'
      })
    }
  }

  // TODO: Return 400 error if parameters are invalid

  // Scan operation parameters
  const scanParams = {
    TableName: groupsTable,
    // TODO: Set correct pagination parameters
    Limit: limit,
    ExclusiveStartKey: nextKey
  }
  console.log('Scan params: ', scanParams)

  const result = await docClient.scan(scanParams).promise()

  const items = result.Items

  console.log('Result: ', result)

  // Return result
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      items,
      // Encode the JSON object so a client can return it in a URL as is
      nextKey: encodeNextKey(result.LastEvaluatedKey)
    })
  }
}

function parseLimitParameter(event){
  const limitStr = getQueryParameter(event, 'limit')
  if(!limitStr){
    return undefined
  }

  const limit = parseInt(limitStr, 10)
  if(limit <= 0){
    throw new Error('Limit should be positive')
  }

  return limit
}

function parseNextKeyParameter(event){
  const nextKey = getQueryParameter(event, 'nextKey')
  if(!nextKey){
    return undefined
  }

  const uriDecoded = decodeURIComponent(nextKey)
  return JSON.parse(uriDecoded)
}

/**
 * Get a query parameter or return "undefined"
 *
 * @param {Object} event HTTP event passed to a Lambda function
 * @param {string} name a name of a query parameter to return
 *
 * @returns {string} a value of a query parameter value or "undefined" if a parameter is not defined
 */
function getQueryParameter(event, name) {
  const queryParams = event.queryStringParameters
  if (!queryParams) {
    return undefined
  }

  return queryParams[name]
}

/**
 * Encode last evaluated key using
 *
 * @param {Object} lastEvaluatedKey a JS object that represents last evaluated key
 *
 * @return {string} URI encoded last evaluated key
 */
function encodeNextKey(lastEvaluatedKey) {
  if (!lastEvaluatedKey) {
    return null
  }

  return encodeURIComponent(JSON.stringify(lastEvaluatedKey))
}
