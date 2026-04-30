import { MetadataRoute } from 'next'
import { getDb, initDb } from '@/lib/db'
import type { Photo } from '@/types'

const SITE_URL = process.env.NEXTAUTH_URL || 'https://your-domain.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/gallery`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ]

  try {
    await initDb()
    const db = getDb()
    const res = await db.execute(
      'SELECT id, updated_at FROM photos WHERE show_public = 1 ORDER BY updated_at DESC LIMIT 200'
    )
    const photos = res.rows as unknown as Pick<Photo, 'id' | 'updated_at'>[]

    for (const photo of photos) {
      routes.push({
        url: `${SITE_URL}/gallery?photo=${photo.id}`,
        lastModified: new Date(photo.updated_at),
        changeFrequency: 'monthly',
        priority: 0.7,
      })
    }
  } catch {
    // DB might not be ready at build time
  }

  return routes
}
