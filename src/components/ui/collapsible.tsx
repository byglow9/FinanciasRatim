import * as React from "react"

interface CollapsibleProps {
  open: boolean
  id?: string
  children: React.ReactNode
}

/**
 * Painel que anima a altura por grid-template-rows 0fr/1fr. O gatilho e de quem
 * usa (com aria-expanded e aria-controls apontando para o id). Fechado, o
 * conteudo sai da ordem de foco e do leitor de tela.
 */
function Collapsible({ open, id, children }: CollapsibleProps) {
  return (
    <div
      id={id}
      aria-hidden={!open}
      inert={!open}
      className={`grid transition-[grid-template-rows] duration-200 ease-out ${
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      }`}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  )
}

export { Collapsible }
