
export const MetricCardSkeleton = () => (
  <div className="relative overflow-hidden rounded-2xl shadow-xl bg-gray-100 p-6 animate-pulse border border-gray-200">
    <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 bg-gray-200 rounded-xl"></div>
      <div className="h-12 bg-gray-200 rounded w-1/4"></div>
    </div>
  </div>
);

export const ChartCardSkeleton = ({ title: _title }: { title: string }) => (
  <div className="rounded-2xl shadow-xl bg-white p-6 animate-pulse border border-gray-100 flex flex-col h-full min-h-[300px]">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
      <div className="h-6 bg-gray-200 rounded w-1/2"></div>
    </div>
    <div className="flex-1 bg-gray-50 rounded-xl"></div>
  </div>
);

export const ProgressListSkeleton = ({ title: _title }: { title: string }) => (
  <div className="rounded-xl shadow-lg bg-white p-5 flex flex-col h-[500px] animate-pulse border border-gray-100">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
    </div>
    <div className="flex-1 overflow-y-auto space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-lg bg-gray-50 p-4 border border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-2 w-1/2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-12"></div>
          </div>
          <div className="h-2 bg-gray-200 rounded-full w-full"></div>
        </div>
      ))}
    </div>
  </div>
);

export const CircularProgressSkeleton = ({ title: _title }: { title: string }) => (
  <div className="rounded-xl shadow-lg bg-white p-5 flex flex-col h-[500px] animate-pulse border border-gray-100">
    <div className="flex items-center gap-2 mb-6">
      <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
    </div>
    <div className="flex flex-col items-center justify-center flex-1">
      <div className="w-64 h-64 rounded-full border-8 border-gray-100 flex items-center justify-center">
        <div className="h-16 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="mt-6 h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  </div>
);

export const ActivityFeedSkeleton = ({ title: _title }: { title: string }) => (
  <div className="flex-1 rounded-lg shadow-md bg-white p-5 animate-pulse border border-gray-100 h-full">
    <div className="flex items-center gap-2 mb-3">
      <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
      <div className="h-6 bg-gray-200 rounded w-1/2"></div>
    </div>
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3">
          <div className="w-9 h-9 bg-gray-200 rounded-full flex-shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            <div className="h-2 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const TableSkeleton = ({ columns = 5, rows = 8 }: { columns?: number, rows?: number }) => (
  <div className="mb-6 rounded-lg shadow-xl bg-white p-0 animate-pulse border border-gray-100 overflow-hidden">
    <div className="h-14 bg-gray-200"></div>
    <div className="divide-y divide-gray-100">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center p-4">
          <div className="w-10 h-10 bg-gray-100 rounded-full"></div>
          {[...Array(columns - 1)].map((_, j) => (
            <div key={j} className={`h-4 bg-gray-100 rounded flex-1 ${j > 2 ? 'hidden md:block' : ''}`}></div>
          ))}
          <div className="h-8 bg-gray-100 rounded w-20"></div>
        </div>
      ))}
    </div>
  </div>
);

export const TableRowSkeleton = ({ columns = 5 }: { columns?: number }) => (
  <>
    {[...Array(8)].map((_, i) => (
      <tr key={i} className="animate-pulse border-b border-gray-100">
        {[...Array(columns)].map((_, j) => (
          <td key={j} className="px-4 py-4">
            <div className={`h-4 bg-gray-100 rounded ${j === 0 ? 'w-3/4' : 'w-1/2'}`}></div>
          </td>
        ))}
      </tr>
    ))}
  </>
);

export const TimelineSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-200"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/6"></div>
          </div>
        </div>
        <div className="ml-6 pl-6 border-l-2 border-gray-100 space-y-3">
          {[...Array(2)].map((_, j) => (
            <div key={j} className="h-24 bg-gray-50 rounded-xl border-2 border-gray-100"></div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export const CalendarSkeleton = () => (
  <div className="animate-pulse bg-white rounded-xl p-4 space-y-4">
    <div className="flex justify-between items-center mb-8">
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      <div className="flex gap-2">
        <div className="h-8 bg-gray-200 rounded w-10"></div>
        <div className="h-8 bg-gray-200 rounded w-10"></div>
      </div>
    </div>
    <div className="grid grid-cols-7 gap-2">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="h-4 bg-gray-100 rounded w-full mb-4"></div>
      ))}
      {[...Array(35)].map((_, i) => (
        <div key={i} className="h-20 bg-gray-50 rounded w-full border border-gray-100"></div>
      ))}
    </div>
  </div>
);

export const CoursePerformanceSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="relative overflow-hidden rounded-xl bg-gray-200 p-4 h-32"></div>
    <div className="bg-white rounded-xl p-4 space-y-4">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-3 rounded-lg border-2 border-gray-100 space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded-full w-12"></div>
          </div>
          <div className="h-2 bg-gray-200 rounded-full w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-1/4"></div>
        </div>
      ))}
    </div>
  </div>
);

export const CourseContentSkeleton = () => (
  <div className="flex gap-6 min-h-[600px] animate-pulse">
    {/* Left Sidebar Skeleton */}
    <div className="w-full lg:w-1/3 space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-gray-100 rounded-xl border-2 border-gray-200"></div>
      ))}
    </div>
    {/* Right Content Skeleton */}
    <div className="flex-1 rounded-2xl shadow-xl bg-gray-50 p-6 border border-gray-100 space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
        <div className="flex-1 space-y-2">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-white rounded-xl border-2 border-gray-100"></div>
        ))}
      </div>
    </div>
  </div>
);

export const CourseCardSkeleton = () => (
  <div className="rounded-xl border-2 border-gray-100 bg-white p-5 space-y-4 animate-pulse">
    <div className="w-14 h-14 bg-gray-200 rounded-xl"></div>
    <div className="space-y-2">
      <div className="h-5 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-100 rounded w-1/4"></div>
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-gray-100 rounded w-full"></div>
      <div className="h-3 bg-gray-100 rounded w-5/6"></div>
    </div>
    <div className="flex justify-between items-center pt-2">
      <div className="h-3 bg-gray-100 rounded w-1/4"></div>
      <div className="w-5 h-5 bg-gray-100 rounded"></div>
    </div>
  </div>
);

export const ProfileSettingsSkeleton = () => (
  <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4 animate-pulse">
    {/* Back Button Skeleton */}
    <div className="fixed top-4 left-4 p-5 bg-white/80 rounded-full shadow-md w-10 h-10"></div>

    <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 md:p-8 border border-sky-100">
        {/* Header Skeleton */}
        <div className="text-center mb-6 space-y-2 flex flex-col items-center">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>

        {/* Two Column Layout Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEFT COLUMN - Profile Picture & User Info */}
          <div className="space-y-5">
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-full bg-gray-200 border-4 border-white shadow-lg"></div>
              <div className="mt-3 h-6 bg-gray-200 rounded w-1/2"></div>
              <div className="mt-1 h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
            
            <div className="space-y-2 mt-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
              </div>
              <div className="h-32 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex items-center justify-center">
                <div className="space-y-2 flex flex-col items-center">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Password Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-gray-200 rounded"></div>
              <div className="h-5 bg-gray-200 rounded w-1/3"></div>
            </div>

            {[...Array(2)].map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                <div className="h-10 bg-gray-50 border-2 border-gray-100 rounded-lg"></div>
              </div>
            ))}

            <div className="pt-2">
              <div className="h-11 bg-gray-200 rounded-lg w-full mt-4"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const ReportTableSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-10 bg-gray-200 rounded w-full mb-4"></div>
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <div className="h-12 bg-gray-100 border-b border-gray-100"></div>
      {[...Array(10)].map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b border-gray-50">
          <div className="w-8 h-8 bg-gray-100 rounded-full"></div>
          <div className="h-4 bg-gray-50 rounded flex-1"></div>
          <div className="h-4 bg-gray-50 rounded flex-1"></div>
          <div className="h-4 bg-gray-50 rounded flex-1"></div>
          <div className="h-4 bg-gray-50 rounded w-16"></div>
        </div>
      ))}
    </div>
  </div>
);

export const PerformanceSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="grid grid-cols-1 gap-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-xl border-2 border-gray-100 bg-white p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-200 rounded-xl"></div>
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-100 rounded w-1/4"></div>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="h-4 bg-gray-100 rounded w-24"></div>
            <div className="h-4 bg-gray-100 rounded w-24"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const SettingsSkeleton = () => (
  <div className="min-h-screen bg-gray-50 animate-pulse">
    {/* Page Title Skeleton */}
    <div className="pt-8 px-6 sm:pl-31 mb-8">
      <div className="h-12 bg-gray-200 rounded-lg w-1/4"></div>
    </div>

    {/* Main Content Skeleton */}
    <div className="flex flex-col items-center mt-4 sm:ml-31 px-2 space-y-8">
      {/* Top Row Skeleton */}
      <div className="flex flex-col md:flex-row gap-8 items-center">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="w-[230px] h-[180px] bg-white rounded-xl shadow-md border border-gray-100 flex flex-col items-center justify-center p-6 space-y-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>

      {/* Bottom Centered Box Skeleton */}
      <div className="w-[230px] h-[180px] bg-white rounded-xl shadow-md border border-gray-100 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
      </div>
    </div>
  </div>
);

