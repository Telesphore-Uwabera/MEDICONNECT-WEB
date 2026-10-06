import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { useGetOrders } from "@/hooks/pharmacy/use-pharmacy-orders";
import { useTranslation } from "react-i18next";

function PharmacyDeliveries() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useGetOrders();
  const deliveries = (data?.data ?? []).filter((order) => order.delivery_type === "delivery");

  return (
    <DashboardLayout role="pharmacy">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.pharmacy.deliveries_title")}
          subtitle={t("pages.pharmacy.deliveries_sub")}
        />
        <div className="p-8">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : isError ? (
            <p className="text-sm text-muted-foreground">{t("pages.pharmacy.load_orders_failed", { defaultValue: "Could not load deliveries." })}</p>
          ) : deliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("pages.pharmacy.no_deliveries", { defaultValue: "No deliveries yet." })}</p>
          ) : (
            <div className="space-y-3">
              {deliveries.map((order) => (
                <div key={order.id} className="rounded-[6px] border border-border bg-card p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-sm">{order.order_number || `#${order.id}`}</p>
                    <p className="text-xs text-muted-foreground mt-1">{order.patient?.name || ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{order.currency} {order.total_amount}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">{order.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default PharmacyDeliveries;
