export function checkAuth(request: Request): boolean {
  const auth = request.headers.get("Authorization");
  const token = auth?.replace("Bearer ", "");
  const secret = process.env.DIARY_SECRET;
  if (!secret) return false;
  return token === secret;
}
