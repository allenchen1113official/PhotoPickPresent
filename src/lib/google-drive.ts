import { google } from 'googleapis'
import type { DriveFile } from '@/types'

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
  )
}

export function getDriveClient(accessToken: string) {
  const auth = getOAuth2Client()
  auth.setCredentials({ access_token: accessToken })
  return google.drive({ version: 'v3', auth })
}

export async function listDrivePhotos(
  accessToken: string,
  folderId?: string,
  pageToken?: string
): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const drive = getDriveClient(accessToken)
  const q = folderId
    ? `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`
    : `mimeType contains 'image/' and trashed=false`

  const res = await drive.files.list({
    q,
    pageSize: 50,
    pageToken,
    fields: 'nextPageToken, files(id,name,mimeType,thumbnailLink,webContentLink,createdTime,size,imageMediaMetadata)',
    orderBy: 'createdTime desc',
  })

  const files = (res.data.files || []).map((f) => ({
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType!,
    thumbnailLink: f.thumbnailLink?.replace('=s220', '=s400') || undefined,
    webContentLink: f.webContentLink || undefined,
    createdTime: f.createdTime || undefined,
  }))

  return { files, nextPageToken: res.data.nextPageToken || undefined }
}

export async function getDriveFileUrl(accessToken: string, fileId: string): Promise<string> {
  return `https://drive.google.com/uc?export=view&id=${fileId}`
}

export async function getDriveThumbnailUrl(fileId: string): Promise<string> {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`
}

export async function listDriveFolders(accessToken: string): Promise<DriveFile[]> {
  const drive = getDriveClient(accessToken)
  const res = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
    pageSize: 50,
    fields: 'files(id,name,mimeType)',
    orderBy: 'name',
  })
  return (res.data.files || []).map((f) => ({
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType!,
  }))
}
