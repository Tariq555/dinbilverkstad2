import type { TireCategoryId } from '@shared/types'
import sommardack from './sommardack.png'
import vinterdack from './vinterdack.png'
import dubbdack from './dubbdack.png'
import friktionsdack from './friktionsdack.png'
import msDack from './ms-dack.png'

/**
 * Bild per däckkategori. Filnamnen följer kategori-id:t, så en ny kategori
 * behöver bara en bild med samma namn och en rad här.
 */
export const CATEGORY_IMAGES: Record<TireCategoryId, string> = {
  sommardack,
  vinterdack,
  dubbdack,
  friktionsdack,
  'ms-dack': msDack,
}
