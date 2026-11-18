import {
  Banknote,
  Car,
  CreditCard,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  LayoutGrid,
  PartyPopper,
  Shirt,
  ShoppingCart,
  Tag,
  TrendingUp,
  Utensils,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react"

/**
 * Unica tabela nome-para-componente das categorias do app. As chaves sao
 * exatamente os nomes permitidos em CATEGORY_ICONS (shared/core/categories.js).
 */
export const CATEGORY_ICON_COMPONENTS: Record<string, LucideIcon> = {
  'shopping-cart': ShoppingCart,
  'utensils': Utensils,
  'car': Car,
  'house': House,
  'heart-pulse': HeartPulse,
  'party-popper': PartyPopper,
  'graduation-cap': GraduationCap,
  'shirt': Shirt,
  'wrench': Wrench,
  'banknote': Banknote,
  'trending-up': TrendingUp,
  'tag': Tag,
  'credit-card': CreditCard,
  'wallet': Wallet,
  'landmark': Landmark,
  'layout-grid': LayoutGrid,
}

/** Componente do icone pelo nome; nome desconhecido ou ausente cai em Tag. */
export function iconComponent(nome?: string): LucideIcon {
  if (nome && Object.prototype.hasOwnProperty.call(CATEGORY_ICON_COMPONENTS, nome)) {
    return CATEGORY_ICON_COMPONENTS[nome]
  }
  return Tag
}
