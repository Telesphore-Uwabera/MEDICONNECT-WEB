// export default PharmacyProfile;

import React, { useState, useRef, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";


function ProfileSkeleton() {
  return (
    <div className="flex-1 p-4 sm:p-5 space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Skeleton className="h-7 w-7 rounded-lg" /><Skeleton className="h-4 w-36" /></div>
            <Skeleton className="h-7 w-14 rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-8 rounded-lg" /><Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-8 rounded-lg col-span-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default ProfileSkeleton;
