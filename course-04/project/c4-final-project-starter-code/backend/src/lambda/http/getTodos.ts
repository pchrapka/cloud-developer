import 'source-map-support/register'
import * as AWS  from 'aws-sdk'
import * as middy from 'middy'
import { cors } from 'middy/middlewares'
import { getUserId } from '../utils'

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

import { createLogger } from '../../utils/logger'
const logger = createLogger('getTodo')

const docClient = new AWS.DynamoDB.DocumentClient()

const todosTable = process.env.TODOS_TABLE
const todosIndex = process.env.TODOS_INDEX

export const handler = middy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // TODO: Get all TODO items for a current user
  logger.info('Caller event', event)
  const userId = getUserId(event)

  logger.info({userId: userId})
  try{
    logger.info('Getting todos')
    const todos = await getTodosPerUser(userId)
    logger.info('Got todos')

    return {
      statusCode: 201,
      body: JSON.stringify({
        items: todos
      })
    }
  } catch(e) {
    logger.error('Error getting todo', { error: e.message})
    return {
      statusCode: 400,
      body: ''
    }
  }

})

handler.use(
  cors({
    credentials: true
  })
)

async function getTodosPerUser(userId: string){
  const result = await docClient.query({
    TableName: todosTable,
    IndexName: todosIndex,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    }
  })
  .promise()

  return result.Items
}
