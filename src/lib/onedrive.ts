import type { DriveFile } from '@/types'

export interface OneDrivePhoto {
  takenDateTime?: string
  cameraMake?: string
  cameraModel?: string
  fNumber?: number
  exposureNumerator?: number
  exposureDenominator?: number
  focalLength?: number
  iso?: number
}

export interface OneDriveFileRaw extends DriveFile {
  photo?: OneDrivePhoto
  imageWidth?: number
  imageHeight?: number
}

async function graphFetch(accessToken: string, url: string) {
  const fullUrl = url.startsWith('https://') ? url : `https://graph.microsoft.com/v1.0${url}`
  const res = await fetch(fullUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Microsoft Graph ${res.status}: ${text}`)
  }
  return res.json()
}

export async function listOneDrivePhotos(
  accessToken: string,
  folderId?: string,
  nextLink?: string
): Promise<{ files: OneDriveFileRaw[]; nextLink?: string }> {
  const url = nextLink
    ?? (folderId
      ? `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children?$top=50&$expand=thumbnails($select=medium)&$select=id,name,file,photo,image,createdDateTime`
      : `https://graph.microsoft.com/v1.0/me/drive/root/children?$top=50&$expand=thumbnails($select=medium)&$select=id,name,file,photo,image,createdDateTime`)

  const data = await graphFetch(accessToken, url)

  const files: OneDriveFileRaw[] = (data.value ?? [])
    .filter((item: any) => item.file?.mimeType?.startsWith('image/'))
    .map((item: any) => ({
      id: item.id,
      name: item.name,
      mimeType: item.file?.mimeType ?? 'image/jpeg',
      thumbnailLink: item.thumbnails?.[0]?.medium?.url,
      webContentLink: item['@microsoft.graph.downloadUrl'],
      createdTime: item.createdDateTime,
      photo: item.photo ?? undefined,
      imageWidth: item.image?.width,
      imageHeight: item.image?.height,
    }))

  return { files, nextLink: data['@odata.nextLink'] }
}

export async function listOneDriveFolders(accessToken: string): Promise<DriveFile[]> {
  const data = await graphFetch(
    accessToken,
    'https://graph.microsoft.com/v1.0/me/drive/root/children?$select=id,name,folder&$top=200'
  )
  return (data.value ?? [])
    .filter((item: any) => item.folder)
    .map((item: any) => ({
      id: item.id,
      name: item.name,
      mimeType: 'application/vnd.microsoft.folder',
    }))
}

// Format OneDrive photo metadata to EXIF-like structure for DB storage
export function oneDrivePhotoToExif(file: OneDriveFileRaw) {
  const p = file.photo
  if (!p) return {}
  const shutterSpeed =
    p.exposureNumerator && p.exposureDenominator
      ? p.exposureNumerator / p.exposureDenominator >= 1
        ? `${p.exposureNumerator / p.exposureDenominator}s`
        : `1/${Math.round(p.exposureDenominator / p.exposureNumerator)}s`
      : undefined
  return {
    taken_at: p.takenDateTime ?? null,
    camera_make: p.cameraMake ?? null,
    camera_model: p.cameraModel ?? null,
    lens_model: null,
    aperture: p.fNumber ?? null,
    shutter_speed: shutterSpeed ?? null,
    iso: p.iso ?? null,
    focal_length: p.focalLength ?? null,
    width: file.imageWidth ?? null,
    height: file.imageHeight ?? null,
  }
}
