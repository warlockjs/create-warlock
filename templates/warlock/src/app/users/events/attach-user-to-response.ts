import { Response } from "@warlock.js/core";

export function attachCurrentUserToResponse(response: Response) {
  if (!response.isJson) return;

  const responseData = response.body;

  if (!responseData || responseData.user) return;

  const currentUser = response.request.user;

  if (!currentUser) return;

  responseData.user = currentUser;
}

// add current user to response
Response.on("sending", attachCurrentUserToResponse);
