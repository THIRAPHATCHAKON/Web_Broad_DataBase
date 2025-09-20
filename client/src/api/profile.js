// client/src/api/profile.js
export async function getProfile() {
  const r = await fetch('/api/profile')
  return r.json()
}
