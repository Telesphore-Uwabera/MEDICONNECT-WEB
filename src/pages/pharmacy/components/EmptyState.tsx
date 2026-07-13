

// export default PharmacyProfile;

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Building2, Plus, Image as ImageIcon, AlertCircle,
} from "lucide-react";
import { t } from "i18next";

// ─────────────────────────────────────────────────────────────────────────────
// Empty state & skeleton
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-20 h-20 rounded-[6px] bg-muted border border-border flex items-center justify-center mb-4">
        <Building2 className="h-9 w-9 text-muted-foreground" />
      </div>
      <h2 className="text-base font-bold text-foreground mb-2">{t("pages.pharmacy.empty_profile_title")}</h2>
      <p className="text-xs text-muted-foreground mb-6 max-w-xs leading-relaxed">
        {t("pages.pharmacy.empty_profile_desc")}
      </p>
      <Button onClick={onCreate} className="text-primary-foreground bg-primary hover:bg-primary/90 gap-2 h-10 px-5">
        <Plus className="h-4 w-4" /> {t("pages.pharmacy.create_profile")}
      </Button>
    </div>
  );
}

export default EmptyState;
