import { cn } from '@/lib/utils'

// Wordmark COINC do Login (sketch 029, cena 5): glifos da Sora 800 como paths, sem moeda no O.
// Os tracados, os deslocamentos e o viewBox foram gerados uma vez por um script descartavel a partir
// dos glifos do sketch (espacos CO 78, OI 112, IN 128, NC 104; escala 660 sobre a capitular de 730).
// Nenhuma fonte carregada e nenhum HTML bruto: so JSX. Altura de capitular de 44 px.

interface Glyph {
  key: string
  transform: string
  d: string
}

const VIEWBOX = '-22.12 -33.18 3702 796.4'
const WIDTH = 223.1
const HEIGHT = 48

const GLYPHS: readonly Glyph[] = [
  {
    key: 'c1',
    transform: 'translate(-38 730) scale(1 -1)',
    d: 'M415 -20Q316 -20 245 14.5Q174 49 128 105.5Q82 162 60 228Q38 294 38 356V378Q38 447 60.5 513.5Q83 580 129.5 634Q176 688 246 720Q316 752 410 752Q510 752 587.5 714.5Q665 677 712 609.5Q759 542 767 453H581Q574 491 551 519Q528 547 492 562.5Q456 578 410 578Q367 578 332.5 563Q298 548 274.5 520.5Q251 493 238.5 454Q226 415 226 366Q226 317 238.5 278Q251 239 275.5 211Q300 183 335 168.5Q370 154 415 154Q485 154 533.5 188Q582 222 592 279H778Q769 197 723 129Q677 61 599 20.5Q521 -20 415 -20Z',
  },
  {
    key: 'o',
    transform: 'translate(788.3 730) scale(1 -1)',
    d: 'M432 -20Q332 -20 258 14.5Q184 49 135 105.5Q86 162 62 228Q38 294 38 356V378Q38 447 63 513.5Q88 580 138 634Q188 688 261.5 720Q335 752 432 752Q528 752 601.5 720Q675 688 725 634Q775 580 800.5 513.5Q826 447 826 378V356Q826 294 801.5 228Q777 162 728 105.5Q679 49 605 14.5Q531 -20 432 -20ZM432 154Q480 154 518 170Q556 186 583 215Q610 244 624 282.5Q638 321 638 366Q638 414 623.5 453Q609 492 582 520Q555 548 517 563Q479 578 432 578Q384 578 346 563Q308 548 281 520Q254 492 240 453Q226 414 226 366Q226 321 240 282.5Q254 244 281 215Q308 186 346 170Q384 154 432 154Z',
  },
  {
    key: 'i',
    transform: 'translate(1662.2 730) scale(1 -1)',
    d: 'M76 0V730H262V0Z',
  },
  {
    key: 'n',
    transform: 'translate(1991.7 730) scale(1 -1)',
    d: 'M74 0V730H379L622 148H657L637 130V730H811V0H504L261 582H226L246 600V0Z',
  },
  {
    key: 'c2',
    transform: 'translate(2879.8 730) scale(1 -1)',
    d: 'M415 -20Q316 -20 245 14.5Q174 49 128 105.5Q82 162 60 228Q38 294 38 356V378Q38 447 60.5 513.5Q83 580 129.5 634Q176 688 246 720Q316 752 410 752Q510 752 587.5 714.5Q665 677 712 609.5Q759 542 767 453H581Q574 491 551 519Q528 547 492 562.5Q456 578 410 578Q367 578 332.5 563Q298 548 274.5 520.5Q251 493 238.5 454Q226 415 226 366Q226 317 238.5 278Q251 239 275.5 211Q300 183 335 168.5Q370 154 415 154Q485 154 533.5 188Q582 222 592 279H778Q769 197 723 129Q677 61 599 20.5Q521 -20 415 -20Z',
  },
]

/**
 * H1 do Login: texto acessivel "Coinc" para leitores de tela e o wordmark COINC em SVG decorativo,
 * na cor da tinta de sucesso (token ok-ink, claro e escuro).
 */
export function CoincWordmark({ className }: { className?: string }) {
  return (
    <h1 className={cn('flex justify-center', className)}>
      <span className="sr-only">Coinc</span>
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox={VIEWBOX}
        width={WIDTH}
        height={HEIGHT}
        className="block h-auto max-w-full overflow-visible fill-ok-ink"
      >
        {GLYPHS.map((g) => (
          <path key={g.key} transform={g.transform} d={g.d} />
        ))}
      </svg>
    </h1>
  )
}
