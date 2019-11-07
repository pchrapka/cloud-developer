import 'source-map-support/register'
import * as AWS  from 'aws-sdk'
import * as middy from 'middy'
import { cors } from 'middy/middlewares'

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

import { createLogger } from '../../utils/logger'
import { getUserId } from '../utils'
const logger = createLogger('generateUploadUrl')

const docClient = new AWS.DynamoDB.DocumentClient()
const s3 = new AWS.S3({
  signatureVersion: 'v4'
})

const todosTable = process.env.TODOS_TABLE
const todosIndex = process.env.TODOS_INDEX
const bucketName = process.env.TODOS_ATTACHMENT_S3_BUCKET
const urlExpiration = process.env.SIGNED_URL_EXPIRATION

export const handler = middy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const todoId = event.pathParameters.todoId
  const userId = getUserId(event)
  logger.info({userId: userId, todoId: todoId})

  try{
    logger.info('Updating todo with attachment')
    await todoUpdate(userId, todoId)
    logger.info('Updated todo with attachment')

    logger.info('Getting upload url')
    const url = getUploadUrl(todoId)
    logger.info('Got upload url')

    // TODO: Return a presigned URL to upload a file for a TODO item with the provided id
    return {
      statusCode: 200,
      body: JSON.stringify({
        uploadUrl: url
      })
    }
  } catch(e) {
    logger.error('Error getting upload url', {error: e.message})
    return {
      statusCode: 404,
      body: JSON.stringify({
        error: 'Error getting upload url'
      })
    }
  }
})

handler.use(
  cors({
    credentials: true
  })
)

async function todoUpdate(userId: string, todoId: string) {
  const result = await docClient.query({
    TableName: todosTable,
    IndexName: todosIndex,
    KeyConditionExpression: 'userId = :userId and todoId = :todoId',
    ExpressionAttributeValues: {
      ':userId': userId,
      ':todoId': todoId
    }
  })
  .promise()
  if(result.Count === 0){
    throw new Error('Invalid todoId')
  }

  const todoItem = result.Items[0]

  logger.info('Updating todo', {todoId: todoId})

  await docClient.update({
    TableName: todosTable,
    Key:{
      "userId": todoItem.userId,
      "createdAt": todoItem.createdAt
    },
    UpdateExpression: "set attachmentUrl=:attachmentUrl",
    ExpressionAttributeValues:{
        ":attachmentUrl":`https://${bucketName}.s3.amazonaws.com/${todoId}`,
    },
    ReturnValues:"UPDATED_NEW"
  }).promise()
}

function getUploadUrl(todoId: string) {
  return s3.getSignedUrl('putObject', {
    Bucket: bucketName,
    Key: todoId,
    Expires: urlExpiration
  })
}