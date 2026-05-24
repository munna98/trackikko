import { DetailHeaderSkeleton, TabsSkeleton } from '@/components/ui/page-skeletons'

export default function StaffDetailLoading() {
  return (
    <div className="space-y-6">
      <DetailHeaderSkeleton />
      <TabsSkeleton tabs={3} />
    </div>
  )
}
