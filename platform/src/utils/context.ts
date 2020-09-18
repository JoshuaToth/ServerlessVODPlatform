export const getUserContext = (request: any) => {
  return request.apiGateway.event.requestContext.authorizer
}
