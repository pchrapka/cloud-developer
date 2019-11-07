import { APIGatewayProxyEvent } from "aws-lambda";
import { getToken, parseUserId } from "../auth/utils";

/**
 * Get a user id from an API Gateway event
 * @param event an event from API Gateway
 *
 * @returns a user id from a JWT token
 */
export function getUserId(event: APIGatewayProxyEvent): string {
  const authorization = event.headers.Authorization
  const jwtToken = getToken(authorization)

  return parseUserId(jwtToken)
}