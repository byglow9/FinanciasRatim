import { useArea } from '@/contexts/AreaContext'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Users, PiggyBank } from 'lucide-react'
import type { AreaType } from '@/types'

export function AreaSelector() {
  const { currentArea, setCurrentArea, settings } = useArea()

  return (
    <Tabs value={currentArea} onValueChange={(value) => setCurrentArea(value as AreaType)}>
      <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
        <TabsTrigger value="ele" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">{settings.tabNames.area1}</span>
        </TabsTrigger>
        <TabsTrigger value="ela" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">{settings.tabNames.area2}</span>
        </TabsTrigger>
        <TabsTrigger value="porquinho" className="flex items-center gap-2">
          <PiggyBank className="h-4 w-4" />
          <span className="hidden sm:inline">{settings.tabNames.piggy}</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
