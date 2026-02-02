import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// NDVI color mapping
export function getNDVIColor(value: number): string {
  if (value < 0) return '#d73027'      // Water/bare soil (red)
  if (value < 0.1) return '#fc8d59'    // Bare soil (orange)
  if (value < 0.2) return '#fee08b'    // Very sparse vegetation (yellow)
  if (value < 0.3) return '#d9ef8b'    // Sparse vegetation (light green)
  if (value < 0.5) return '#91cf60'    // Moderate vegetation (green)
  if (value < 0.7) return '#1a9850'    // Dense vegetation (dark green)
  return '#006837'                      // Very dense vegetation (very dark green)
}

// NDVI category labels
export function getNDVICategory(value: number): string {
  if (value < 0) return 'Water/Bare'
  if (value < 0.2) return 'Sparse'
  if (value < 0.4) return 'Moderate'
  if (value < 0.6) return 'Healthy'
  return 'Very Healthy'
}

// Format area in hectares or acres
export function formatArea(sqMeters: number, unit: 'ha' | 'acre' = 'ha'): string {
  if (unit === 'acre') {
    return `${(sqMeters / 4046.86).toFixed(2)} acres`
  }
  return `${(sqMeters / 10000).toFixed(2)} ha`
}

// Format date for display
export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
