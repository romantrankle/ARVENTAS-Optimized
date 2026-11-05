import { TEAM_PHOTOS, TEAM_PORTRAITS } from './team.js'
import { PROVIDED_PHOTOS } from './providedPhotos.js'
import { EDITORIAL_PHOTOS } from './editorialPhotos.js'
import { KNOWLEDGE_CATEGORY_PHOTOS } from './knowledgePhotos.js'
import { OWNER_HOUSE_PHOTO } from './ownerHouse.js'
import { LEGACY_PHOTO_QUALITY } from './legacyPhotoQuality.js'
import { RESPONSIVE_VARIANTS } from './responsiveVariants.js'
import aliases from './photoQualityAliases.js'

// Same-photo replacements only. Original full-size photographs take precedence over
// previously reduced delivery copies; captions and image choices stay with callers.
const photos = [...Object.values(TEAM_PHOTOS), ...TEAM_PORTRAITS, ...Object.values(PROVIDED_PHOTOS), ...Object.values(EDITORIAL_PHOTOS), ...Object.values(KNOWLEDGE_CATEGORY_PHOTOS), OWNER_HOUSE_PHOTO, ...Object.values(LEGACY_PHOTO_QUALITY)]
const SOURCES = new Map()
for (const photo of photos) {
  SOURCES.set(photo.src, photo)
  for (const candidate of photo.srcSet?.split(',') || []) SOURCES.set(candidate.trim().split(/\s+/)[0], photo)
}
for (const [previous, current] of Object.entries(aliases)) {
  const photo = SOURCES.get(current)
  if (photo) SOURCES.set(previous, photo)
}
SOURCES.set('/media/p/team-analyse.webp', TEAM_PHOTOS.market)
SOURCES.set('/media/p/owner-brown-house.png', OWNER_HOUSE_PHOTO)
for (const [previous, photo] of Object.entries(LEGACY_PHOTO_QUALITY)) SOURCES.set(previous, photo)
for (const [previous, photo] of Object.entries(RESPONSIVE_VARIANTS)) SOURCES.set(previous, photo)

export function qualityPhoto(source) {
  const original = SOURCES.get(source?.src)
  return original ? { ...source, ...original, alt: source.alt ?? original.alt ?? '' } : source
}
