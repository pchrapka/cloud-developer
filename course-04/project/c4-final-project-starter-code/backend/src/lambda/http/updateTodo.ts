import 'source-map-support/register'
import * as AWS  from 'aws-sdk'
import * as middy from 'middy'
import { cors } from 'middy/middlewares'

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

import { UpdateTodoRequest } from '../../requests/UpdateTodoRequest'

import { createLogger } from '../../utils/logger'
import { getUserId } from '../utils'
const logger = createLogger('updateTodo')

const docClient = new AWS.DynamoDB.DocumentClient()
const todosTable = process.env.TODOS_TABLE
const todosIndex = process.env.TODOS_INDEX

export const handler = middy( async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info('Event', event)
  const todoId = event.pathParameters.todoId
  const updateTodoRequest: UpdateTodoRequest = JSON.parse(event.body)
  const userId = getUserId(event)

  // TODO: Update a TODO item with the provided id using values in the "updatedTodo" object
  logger.info({userId: userId, todoId: todoId})
  try{
    await updateTodo(userId, todoId, updateTodoRequest)
    logger.info('Updated todo')

    return {
      statusCode: 200,
      body: ''
    }
  } catch(e) {
    logger.error('Error updating todo', { error: e.message })
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

async function updateTodo(
  userId: string,
  todoId: string,
  updatedTodoRequest: UpdateTodoRequest
) {

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
    logger.error('Todo not found')
    throw new Error('Todo not found')
  }

  const todoItem = result.Items[0]

  logger.info('Updating todo')

  await docClient.update({
    TableName: todosTable,
    Key:{
      "userId": todoItem.userId,
      "createdAt": todoItem.createdAt
    },
    UpdateExpression: "set done=:done, dueDate=:dueDate, #name=:name",
    ExpressionAttributeValues:{
        ":done":updatedTodoRequest.done,
        ":dueDate":updatedTodoRequest.dueDate,
        ":name":updatedTodoRequest.name,
    },
    ExpressionAttributeNames: {
      "#name": "name"
    },
    ReturnValues:"UPDATED_NEW"
  }).promise()
}