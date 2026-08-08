export function inviteMember(currentUser, email) {
  if (!currentUser) {
    return { status: 401, error: "Unauthorized" };
  }
  return { status: 200, success: true, invited: email };
}
