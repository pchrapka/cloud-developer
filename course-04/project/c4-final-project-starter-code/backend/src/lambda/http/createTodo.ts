import 'source-map-support/register'
import * as AWS  from 'aws-sdk'
import * as middy from 'middy'
import { cors } from 'middy/middlewares'
import * as uuid from 'uuid'

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

import { CreateTodoRequest } from '../../requests/CreateTodoRequest'
import { TodoItem } from '../../models/TodoItem'
import { getUserId } from '../utils'

import { createLogger } from '../../utils/logger'
const logger = createLogger('createTodo')

const docClient = new AWS.DynamoDB.DocumentClient()
const todosTable = process.env.TODOS_TABLE

export const handler = middy(async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const newTodo: CreateTodoRequest = JSON.parse(event.body)
  const userId = getUserId(event)

  // TODO: Implement creating a new TODO item
  try{
    const newItem = await createTodo(newTodo, userId)
    return {
      statusCode: 201,
      body: JSON.stringify({
        item: newItem
      })
    }
  } catch(e) {
    logger.error('Error creating todo', {error: e.message})
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

export async function createTodo(
  createTodoRequest: CreateTodoRequest,
  userId: string
): Promise<TodoItem> {

  const todoId = uuid.v4()

  const todoItem = {
    todoId: todoId,
    userId: userId,
    name: createTodoRequest.name,
    dueDate: createTodoRequest.dueDate,
    createdAt: new Date().toISOString(),
    done: false
  }

  logger.info('Creating new todo', todoItem)

  await docClient.put({
    TableName: todosTable,
    Item: todoItem
  }).promise()

  return todoItem as TodoItem
}
