export const MOCK = import.meta.env.VITE_USE_EMULATOR === 'true'

export function mList<T>(key: string): T[] {
  return JSON.parse(localStorage.getItem(`db::${key}`) ?? '[]')
}

export function mSave<T>(key: string, items: T[]): void {
  localStorage.setItem(`db::${key}`, JSON.stringify(items))
}

export function mId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function mGetDoc<T>(key: string): T | null {
  return JSON.parse(localStorage.getItem(`doc::${key}`) ?? 'null')
}

export function mSetDoc<T>(key: string, data: T): void {
  localStorage.setItem(`doc::${key}`, JSON.stringify(data))
}
