import { DetailHeaderSkeleton, TabsSkeleton } from '@/components/ui/page-skeletons'

export default function PartyDetailLoading() {
  return (
    <div className="space-y-6">
      <DetailHeaderSkeleton />
      <TabsSkeleton tabs={4} />
    </div>
  )
}
