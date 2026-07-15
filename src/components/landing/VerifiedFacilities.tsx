import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Pill,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ApiHospital,
  useGetSearchHospitals,
} from "@/hooks/patient/use-patient-search-hospital";
import {
  Pharmacy,
  useSearchPharmacies,
} from "@/hooks/patient/use-patient-search-pharmacy";

type TabKey = "facilities" | "pharmacies";

const FACILITY_IMAGES = [
  "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=900&q=80",
];

const PHARMACY_IMAGES = [
  "/images/arpad-czapp-tvP6pCnq9iI.jpg",
  "https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=900&q=80",
];

function imageFor(index: number, type: TabKey) {
  const list = type === "facilities" ? FACILITY_IMAGES : PHARMACY_IMAGES;
  return list[index % list.length];
}

function SkeletonCard() {
  return (
    <div className="min-w-[290px] flex-1 rounded-[6px] border border-border bg-card shadow-sm overflow-hidden animate-pulse">
      <div className="h-44 bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-6 w-20 rounded-[6px] bg-muted" />
          <div className="h-6 w-24 rounded-[6px] bg-muted" />
        </div>
        <div className="h-9 rounded-[6px] bg-muted" />
      </div>
    </div>
  );
}

function FacilityCard({ facility, index }: { facility: ApiHospital; index: number }) {
  const { t } = useTranslation();
  const department = facility.departments?.[0]?.name_en ?? t("pages.landing.general_practice");

  return (
    <article className="min-w-[290px] sm:min-w-[330px] flex-1 rounded-[6px] border border-border bg-card shadow-sm overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-44 overflow-hidden bg-muted">
        <img
          src={imageFor(index, "facilities")}
          alt={facility.name_en}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
          loading="lazy"
        />
        <span className="absolute left-3 bottom-3 inline-flex items-center gap-1.5 rounded-[6px] bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 shadow-sm">
          <Clock className="h-3 w-3" />
          {facility.is_open_24h ? t("pages.landing.open_24h") : t("pages.landing.open_today")}
        </span>
      </div>

      <div className="p-4">
        <h3 className="text-base font-semibold text-foreground line-clamp-1">
          {facility.name_en}
        </h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground line-clamp-1">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {[facility.city, facility.address].filter(Boolean).join(", ")}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-[6px] bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            {t("pages.landing.spots_count", { count: facility.departments_count || facility.departments?.length || 1 })}
          </span>
          <span className="rounded-[6px] bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground">
            {department}
          </span>
        </div>

        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Stethoscope className="h-3.5 w-3.5" />
          {t("pages.landing.facility_card_meta", {
            doctors: facility.doctors_count ?? 0,
            days: facility.is_open_24h ? 7 : Math.max(1, facility.working_hours?.filter((h) => !h.is_closed).length || 1),
          })}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-[6px]">
            <Link to={`/patient/search-facilities?facility=${facility.slug}`}>
              {t("pages.landing.view_schedule")}
            </Link>
          </Button>
          <Button asChild size="sm" className="rounded-[6px]">
            <Link to={`/patient/search-facilities?facility=${facility.slug}`}>
              {t("pages.landing.book_visit")}
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function PharmacyCard({ pharmacy, index }: { pharmacy: Pharmacy; index: number }) {
  const { t } = useTranslation();

  return (
    <article className="min-w-[290px] sm:min-w-[330px] flex-1 rounded-[6px] border border-border bg-card shadow-sm overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-44 overflow-hidden bg-muted">
        <img
          src={pharmacy.logo || imageFor(index, "pharmacies")}
          alt={pharmacy.name}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
          loading="lazy"
        />
        <span className="absolute left-3 bottom-3 inline-flex items-center gap-1.5 rounded-[6px] bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 shadow-sm">
          <Clock className="h-3 w-3" />
          {pharmacy.is_open_24h ? t("pages.landing.open_24h") : t("pages.landing.open_now")}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 text-base font-semibold text-foreground line-clamp-1">
            {pharmacy.name}
          </h3>
          {pharmacy.is_verified && <ShieldCheck className="h-4 w-4 text-primary shrink-0" />}
        </div>
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground line-clamp-1">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {[pharmacy.city, pharmacy.address].filter(Boolean).join(", ")}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-[6px] bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            {t("pages.landing.in_stock")}
          </span>
          <span className="rounded-[6px] bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground">
            {pharmacy.offers_delivery ? t("pages.landing.delivery") : t("pages.landing.pickup")}
          </span>
        </div>

        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Pill className="h-3.5 w-3.5" />
          {t("pages.landing.pharmacy_card_meta", {
            minutes: pharmacy.estimated_delivery_minutes || "30",
            fulfillment: pharmacy.offers_delivery ? t("pages.landing.free_delivery") : t("pages.landing.pickup_available"),
          })}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-[6px]">
            <Link to={`/patient/search-pharmacy?pharmacy=${pharmacy.slug}`}>
              {t("pages.landing.view_inventory")}
            </Link>
          </Button>
          <Button asChild size="sm" className="rounded-[6px]">
            <Link to={`/patient/search-pharmacy?pharmacy=${pharmacy.slug}`}>
              {t("pages.landing.order_now")}
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function VerifiedFacilities() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>("facilities");
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const { data: facilitiesData, isLoading: facilitiesLoading } = useGetSearchHospitals({ per_page: 6 });
  const { data: pharmaciesData, isLoading: pharmaciesLoading } = useSearchPharmacies({ per_page: 6 });

  const facilities = useMemo(() => facilitiesData?.data ?? [], [facilitiesData]);
  const pharmacies = useMemo(() => pharmaciesData?.data ?? [], [pharmaciesData]);
  const isLoading = activeTab === "facilities" ? facilitiesLoading : pharmaciesLoading;

  const scrollCards = (direction: "left" | "right") => {
    scrollerRef.current?.scrollBy({
      left: direction === "left" ? -360 : 360,
      behavior: "smooth",
    });
  };

  return (
    <section id="pharmacy" className="relative border-t border-border bg-background py-10 md:py-12">
      <span id="hospitals" className="absolute -top-24" aria-hidden="true" />
      <div className="container">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">
              {t("pages.landing.verified_facilities_title")}
            </h2>
            <p className="mt-2 text-sm md:text-base text-muted-foreground">
              {t("pages.landing.verified_facilities_sub")}
            </p>
          </div>

          <Link
            to={activeTab === "facilities" ? "/patient/search-facilities" : "/patient/search-pharmacy"}
            className="text-sm font-semibold text-primary hover:underline"
          >
            {activeTab === "facilities"
              ? t("pages.landing.view_all_facilities")
              : t("pages.landing.view_all_pharmacies")}
          </Link>
        </div>

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex w-full rounded-[6px] border border-border bg-card p-1 shadow-sm sm:w-auto">
            {([
              { key: "facilities", icon: Building2, label: t("pages.landing.health_facilities_tab") },
              { key: "pharmacies", icon: Pill, label: t("pages.landing.pharmacies_tab") },
            ] as const).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-[6px] px-4 py-3 text-sm font-semibold transition-all sm:flex-none sm:min-w-[210px]",
                    activeTab === tab.key
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Button
              variant="outline"
              size="icon"
              className="rounded-[6px]"
              onClick={() => scrollCards("left")}
              aria-label={t("pages.landing.previous_cards")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-[6px]"
              onClick={() => scrollCards("right")}
              aria-label={t("pages.landing.next_cards")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="mt-6 flex gap-5 overflow-x-auto pb-3 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : activeTab === "facilities"
              ? facilities.map((facility, index) => (
                <div key={facility.id} className="snap-start">
                  <FacilityCard facility={facility} index={index} />
                </div>
              ))
              : pharmacies.map((pharmacy, index) => (
                <div key={pharmacy.id} className="snap-start">
                  <PharmacyCard pharmacy={pharmacy} index={index} />
                </div>
              ))}
        </div>

        {!isLoading && activeTab === "facilities" && facilities.length === 0 && (
          <div className="mt-8 rounded-[6px] border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {t("pages.landing.no_hospitals_found")}
          </div>
        )}
        {!isLoading && activeTab === "pharmacies" && pharmacies.length === 0 && (
          <div className="mt-8 rounded-[6px] border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {t("pages.landing.no_pharmacies_found")}
          </div>
        )}
      </div>
    </section>
  );
}
