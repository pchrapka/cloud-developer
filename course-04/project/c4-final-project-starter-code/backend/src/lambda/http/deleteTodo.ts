import 'source-map-support/register'
import * as AWS  from 'aws-sdk'
import * as middy from 'middy'
import { cors } from 'middy/middlewares'

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

import { createLogger } from '../../utils/logger'
import { getUserId } from '../utils'
const logger = createLogger('deleteTodo')

const docClient = new AWS.DynamoDB.DocumentClient()
const s3 = new AWS.S3({
  signatureVersion: 'v4'
})

const todosTable = process.env.TODOS_TABLE
const todosIndex = process.env.TODOS_INDEX
const bucketName = process.env.TODOS_ATTACHMENT_S3_BUCKET

export const handler = middy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const todoId = event.pathParameters.todoId
  const userId = getUserId(event)

  // TODO: Remove a TODO item by id
  logger.info({userId: userId, todoId: todoId})
  try{
    await deleteTodo(userId, todoId)
    logger.info('Deleted todo')

    return {
      statusCode: 200,
      body: ''
    }
  } catch(e) {
    logger.error('Error deleting todo', { error: e.message})
    return {
      statusCode: 400,
      body: ''
    }
  }
  return undefined
})

handler.use(
  cors({
    credentials: true
  })
)

async function deleteTodo(userId: string, todoId: string){
  const result = await docClient.query({
    TableName: todosTable,
    IndexName: todosIndex,
    KeyConditionExpression: 'userId = :userId and todoId = :todoId',
    ExpressionAttributeValues:{
      ':userId': userId,
      ':todoId': todoId
    }
  }).promise()

  if (result.Count === 0){
    throw new Error('Todo not found')
  }

  const todoItem = result.Items[0]
  if('attachmentUrl' in todoItem){
    logger.info('Deleting attachment')
    await s3.deleteObject({
      Bucket: bucketName, 
      Key: todoId
    }).promise()
  }

  logger.info('Deleting todo')
  await docClient.delete({
    TableName: todosTable,
    Key:{
      "userId": todoItem.userId,
      "createdAt": todoItem.createdAt
    }
  }).promise()
}