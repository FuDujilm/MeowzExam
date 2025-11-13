import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'

const DEFAULT_BASE_DIR = path.resolve(
  process.env.LIBRARY_FILES_DIR ?? path.join(process.cwd(), 'storage', 'question-libraries'),
)

export function getLibraryFilesBaseDir() {
  return DEFAULT_BASE_DIR
}

export function sanitizeLibraryCode(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^[_-]+|[_-]+$/g, '') || 'LIBRARY'
}

export function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^[_-]+|[_-]+$/g, '') || 'library.json'
}

export function isPathWithinBase(filePath: string) {
  const base = getLibraryFilesBaseDir()
  const resolved = path.resolve(filePath)
  return resolved.startsWith(base)
}

export async function ensureDirectory(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true })
}

export async function saveLibraryFile(options: {
  libraryCode: string
  fileContent: string
  originalName?: string | null
}) {
  const { libraryCode, fileContent, originalName } = options
  const sanitizedCode = sanitizeLibraryCode(libraryCode || 'LIBRARY')
  const safeOriginalName = sanitizeFileName(originalName || `${sanitizedCode}.json`)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const finalName = `${timestamp}_${safeOriginalName}`
  const baseDir = getLibraryFilesBaseDir()
  const libraryDir = path.join(baseDir, sanitizedCode)
  await ensureDirectory(libraryDir)
  const filePath = path.join(libraryDir, finalName)
  await fs.writeFile(filePath, fileContent, 'utf8')
  const buffer = Buffer.from(fileContent, 'utf8')
  const checksum = createHash('sha256').update(buffer).digest('hex')
  return {
    filename: finalName,
    filepath: filePath,
    fileSize: buffer.byteLength,
    checksum,
  }
}

export async function deleteLibraryFileFromDisk(filePath: string) {
  if (!isPathWithinBase(filePath)) {
    throw new Error('Invalid file path.')
  }
  try {
    await fs.unlink(filePath)
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      throw error
    }
  }
}

export async function readLibraryFile(filePath: string) {
  if (!isPathWithinBase(filePath)) {
    throw new Error('Invalid file path.')
  }
  return fs.readFile(filePath)
}
