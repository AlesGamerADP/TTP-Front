import { Card, CardContent, CardHeader } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

export function ComponentCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ComponentListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-3 w-20" />
            <div className="flex justify-end">
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="app-shell min-h-screen">
      {/* Header Skeleton */}
      <header className="app-subheader border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters Skeleton */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Content Skeleton */}
        <div className="space-y-6">
          <ComponentListSkeleton count={8} />
        </div>
      </main>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="w-8 h-8 rounded" />
        </div>
      </CardHeader>
    </Card>
  );
}

export function SearchResultsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-3 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}