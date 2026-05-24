import { DetailHeaderSkeleton, TabsSkeleton } from '@/components/ui/page-skeletons'

export default function MachineDetailLoading() {
  return (
    <div className="space-y-6">
      <DetailHeaderSkeleton />
      <TabsSkeleton tabs={5} />
    </div>
  )
}
