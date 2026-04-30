import { Suspense } from 'react'

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>
}
