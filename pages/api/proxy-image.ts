import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' })
  }

  try {
    const response = await fetch(url)
    const buffer = await response.arrayBuffer()
    const headers = new Headers(response.headers)
    headers.set('Access-Control-Allow-Origin', '*')

    res.setHeader('Content-Type', headers.get('Content-Type') || 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=86400') // Cache for 1 day
    res.send(Buffer.from(buffer))
  } catch (error) {
    console.error('Error proxying image:', error)
    res.status(500).json({ error: 'Failed to proxy image' })
  }
}
