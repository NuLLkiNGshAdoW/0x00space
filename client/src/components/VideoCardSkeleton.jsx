export default function VideoCardSkeleton() {
  return (
    <div className="glass overflow-hidden rounded-xl">
      <div className="aspect-video animate-pulse bg-panel2" />
      <div className="space-y-2.5 p-4">
        <div className="h-3.5 w-[90%] animate-pulse rounded bg-panel2" />
        <div className="h-3.5 w-1/2 animate-pulse rounded bg-panel2" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-panel2" />
      </div>
    </div>
  );
}
