import { useArea } from '@/contexts/AreaContext'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, PiggyBank } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { AreaType } from '@/types'

const areaToIndex: Record<AreaType, number> = { ele: 0, ela: 1, porquinho: 2 }

export function AreaSelector() {
  const { currentArea, setCurrentArea, settings } = useArea()
  const navigate = useNavigate()
  const location = useLocation()

  const handleAreaChange = (value: string) => {
    const area = value as AreaType
    setCurrentArea(area)
    if (area === 'porquinho') {
      navigate('/porquinho')
    } else if (location.pathname === '/porquinho') {
      navigate('/')
    }
  }

  return (
    <Tabs value={currentArea} onValueChange={handleAreaChange}>
      <TabsList className="grid w-full grid-cols-3 lg:w-[400px]" activeIndex={areaToIndex[currentArea]} itemCount={3}>
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
