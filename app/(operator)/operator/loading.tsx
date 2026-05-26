import { Loader2 } from 'lucide-react'

export default function OperatorLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading...</p>
    </div>
  )
}
