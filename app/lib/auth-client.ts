import { createAuthClient } from 'better-auth/client'

export const authClient = createAuthClient({
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://job-for-sure.vercel.app' 
    : 'http://localhost:5173',
})
