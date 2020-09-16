
exports.getUserContext = (request) => {
	return request.apiGateway.event.requestContext.authorizer;
}