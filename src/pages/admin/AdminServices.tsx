import { FormEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowUpDown,
  Eye,
  ImageIcon,
  Link2,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RichTextarea,
  RichTextRenderer,
  richTextToPlainText,
} from "@/components/ui/rich-textarea";
import {
  useCreateService,
  useDeleteService,
  useGetAdminServices,
  useToggleServiceActive,
  useUpdateService,
} from "@/hooks/admin/use-admin-services";
import type { ApiService } from "@/hooks/use-services";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "active" | "inactive";
type ServiceLang = "en" | "fr" | "kiny";

const LANGUAGES: Array<{ key: ServiceLang; label: string; helper: string }> = [
  {
    key: "en",
    label: "English",
    helper: "Shown when visitors browse in English.",
  },
  {
    key: "fr",
    label: "French",
    helper: "Shown when visitors browse in French.",
  },
  {
    key: "kiny",
    label: "Kinyarwanda",
    helper: "Shown when visitors browse in Kinyarwanda.",
  },
];

const emptyForm = {
  title_en: "",
  title_fr: "",
  title_kiny: "",
  description_en: "",
  description_fr: "",
  description_kiny: "",
  order: "1",
  redirect_url: "",
  is_active: true,
};

type ServiceFormState = typeof emptyForm;

function createFormState(service?: ApiService | null): ServiceFormState {
  if (!service) return { ...emptyForm };
  return {
    title_en: service.title_en ?? "",
    title_fr: service.title_fr ?? "",
    title_kiny: service.title_kiny ?? "",
    description_en: service.description_en ?? "",
    description_fr: service.description_fr ?? "",
    description_kiny: service.description_kiny ?? "",
    order: String(service.order ?? 1),
    redirect_url: service.redirect_url ?? "",
    is_active: !!service.is_active,
  };
}

function appendServiceFormData(form: ServiceFormState, file: File | null) {
  const formData = new FormData();
  formData.append("title_en", form.title_en);
  formData.append("title_fr", form.title_fr);
  formData.append("title_kiny", form.title_kiny);
  formData.append("description_en", form.description_en);
  formData.append("description_fr", form.description_fr);
  formData.append("description_kiny", form.description_kiny);
  formData.append("order", form.order || "1");
  formData.append("redirect_url", form.redirect_url);
  formData.append("is_active", form.is_active ? "1" : "0");
  if (file) formData.append("image", file);
  return formData;
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border px-1.5 py-0 text-[9px] font-medium capitalize",
        active
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border-slate-500/30 bg-slate-500/10 text-slate-500 dark:text-slate-400",
      )}
    >
      <span
        className={cn(
          "mr-1 h-1 w-1 rounded-full",
          active ? "bg-emerald-500" : "bg-slate-400",
        )}
      />
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

function ServiceImage({ service }: { service: ApiService }) {
  return (
    <div className="h-11 w-14 shrink-0 overflow-hidden rounded-[6px] border border-border/60 bg-primary/10">
      {service.image_url ? (
        <img
          src={service.image_url}
          alt={service.title_en}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-primary">
          <ImageIcon className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

function ServiceFormModal({
  service,
  onClose,
}: {
  service: ApiService | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<ServiceFormState>(() =>
    createFormState(service),
  );
  const [file, setFile] = useState<File | null>(null);
  const [activeLang, setActiveLang] = useState<ServiceLang>("en");
  const [error, setError] = useState("");
  const create = useCreateService();
  const update = useUpdateService(service?.id ?? 0);
  const isEditing = !!service;
  const isSaving = create.isPending || update.isPending;

  const setField = (key: keyof ServiceFormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      const payload = appendServiceFormData(form, file);
      if (isEditing) {
        await update.mutateAsync(payload);
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("common.something_went_wrong", {
              defaultValue: "Something went wrong",
            }),
      );
    }
  };

  const activeTitleKey = `title_${activeLang}` as keyof ServiceFormState;
  const activeDescriptionKey =
    `description_${activeLang}` as keyof ServiceFormState;
  const activeLanguage =
    LANGUAGES.find((language) => language.key === activeLang) ?? LANGUAGES[0];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[6px] border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-primary/20 bg-primary/10 text-primary">
              <Tag className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">
                {isEditing
                  ? t("admin.services.edit_service", {
                      defaultValue: "Edit service",
                    })
                  : t("admin.services.new_service", {
                      defaultValue: "New service",
                    })}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t("admin.services.modal_subtitle", {
                  defaultValue:
                    "Create multilingual homepage service cards with rich descriptions.",
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[6px] p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label={t("common.close", { defaultValue: "Close" })}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-132px)] overflow-y-auto p-4">
          {error && (
            <div className="mb-4 rounded-[6px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="space-y-3">
              <div className="rounded-[6px] border border-border/70 bg-background p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
                  {t("admin.services.languages", { defaultValue: "Languages" })}
                </p>
                <div className="mt-3 space-y-1.5">
                  {LANGUAGES.map((language) => {
                    const titleKey =
                      `title_${language.key}` as keyof ServiceFormState;
                    const descriptionKey =
                      `description_${language.key}` as keyof ServiceFormState;
                    const complete =
                      Boolean(form[titleKey]) &&
                      Boolean(
                        richTextToPlainText(String(form[descriptionKey])),
                      );
                    return (
                      <button
                        key={language.key}
                        type="button"
                        onClick={() => setActiveLang(language.key)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-[6px] border px-3 py-2 text-left text-[11px] font-semibold transition-colors",
                          activeLang === language.key
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border/60 bg-card text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {language.label}
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            complete
                              ? "bg-emerald-500"
                              : "bg-muted-foreground/40",
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[6px] border border-border/70 bg-background p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
                  {t("admin.services.card_settings", {
                    defaultValue: "Card settings",
                  })}
                </p>
                <div className="mt-3 space-y-3">
                  <label className="space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
                      {t("admin.services.order", { defaultValue: "Order" })}
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={form.order}
                      onChange={(event) =>
                        setField("order", event.target.value)
                      }
                      className="h-9 w-full rounded-[6px] border border-border bg-card px-3 text-[12px] outline-none focus:border-primary"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
                      {t("admin.services.image", { defaultValue: "Image" })}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        setFile(event.target.files?.[0] ?? null)
                      }
                      className="block w-full rounded-[6px] border border-border bg-card px-2 py-2 text-[11px] file:mr-2 file:rounded-[6px] file:border-0 file:bg-primary file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-primary-foreground"
                    />
                  </label>

                  <label className="flex items-center gap-2 rounded-[6px] border border-border/60 bg-card px-3 py-2 text-[12px] font-semibold text-foreground">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(event) =>
                        setField("is_active", event.target.checked)
                      }
                      className="h-4 w-4 accent-primary"
                    />
                    {t("admin.services.active", {
                      defaultValue: "Show on homepage",
                    })}
                  </label>
                </div>
              </div>
            </aside>

            <section className="rounded-[6px] border border-border/70 bg-background shadow-sm">
              <div className="border-b border-border/60 px-4 py-3">
                <p className="text-[13px] font-semibold text-foreground">
                  {activeLanguage.label}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {activeLanguage.helper}
                </p>
              </div>

              <div className="space-y-4 p-4">
                <label className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
                    {t("admin.services.title_field", {
                      defaultValue: "Service title",
                    })}
                  </span>
                  <input
                    value={String(form[activeTitleKey])}
                    onChange={(event) =>
                      setField(activeTitleKey, event.target.value)
                    }
                    className="h-10 w-full rounded-[6px] border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                    required
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
                    {t("admin.services.rich_description", {
                      defaultValue: "Rich description",
                    })}
                  </span>
                  <RichTextarea
                    value={String(form[activeDescriptionKey])}
                    onChange={(value) => setField(activeDescriptionKey, value)}
                    placeholder={t("admin.services.description_placeholder", {
                      defaultValue:
                        "Describe the service, who it helps, and what happens next...",
                    })}
                    minHeight={230}
                    maxHeight={420}
                    className="bg-card"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
                    {t("admin.services.redirect_url", {
                      defaultValue: "Explore URL",
                    })}
                  </span>
                  <div className="relative">
                    <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={form.redirect_url}
                      onChange={(event) =>
                        setField("redirect_url", event.target.value)
                      }
                      placeholder="/patient/search-doctors"
                      className="h-10 w-full rounded-[6px] border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </label>
              </div>
            </section>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border/60 p-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-[6px]"
            onClick={onClose}
          >
            {t("common.cancel", { defaultValue: "Cancel" })}
          </Button>
          <Button
            type="submit"
            className="h-9 rounded-[6px]"
            disabled={isSaving}
          >
            {isSaving
              ? t("common.saving", { defaultValue: "Saving..." })
              : t("admin.services.save_service", {
                  defaultValue: "Save service",
                })}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function AdminServices() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<ApiService | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [preview, setPreview] = useState<ApiService | null>(null);

  const queryParams = {
    search,
    is_active: status === "all" ? undefined : status === "active",
    per_page: 50,
  };
  const { data, isLoading, isError, refetch } =
    useGetAdminServices(queryParams);
  const deleteService = useDeleteService();

  const services = useMemo(
    () =>
      (data?.data ?? [])
        .slice()
        .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999) || a.id - b.id),
    [data],
  );

  const activeCount = services.filter((service) => service.is_active).length;
  const inactiveCount = services.length - activeCount;

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (service: ApiService) => {
    setEditing(service);
    setModalOpen(true);
  };

  const handleDelete = async (service: ApiService) => {
    if (
      !window.confirm(
        t("admin.services.delete_confirm", {
          defaultValue: "Remove this service?",
        }),
      )
    )
      return;
    await deleteService.mutateAsync(service.id);
  };

  return (
    <DashboardLayout role="admin">
      <div className="flex h-full flex-col">
        <PageHeader
          title={t("admin.services.title", { defaultValue: "Services" })}
          subtitle={t("admin.services.subtitle", {
            defaultValue:
              "Manage homepage service cards and their destination links.",
          })}
        />

        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <StatCard
              label={t("admin.services.total", {
                defaultValue: "Total services",
              })}
              value={data?.total ?? services.length}
              icon={Tag}
            />
            <StatCard
              label={t("admin.services.active_count", {
                defaultValue: "Active",
              })}
              value={activeCount}
              icon={Eye}
              accent="success"
            />
            <StatCard
              label={t("admin.services.inactive_count", {
                defaultValue: "Inactive",
              })}
              value={inactiveCount}
              icon={ArrowUpDown}
              accent="warning"
            />
          </div>

          <section className="rounded-[6px] border border-border/70 bg-card shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[13px] font-semibold text-foreground">
                  {t("admin.services.content_library", {
                    defaultValue: "Homepage services",
                  })}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t("admin.services.content_library_sub", {
                    defaultValue:
                      "Cards are displayed by order under the pharmacy banner.",
                  })}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:min-w-[560px]">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("admin.services.search_placeholder", {
                      defaultValue: "Search services...",
                    })}
                    className="h-9 w-full rounded-[6px] border border-border bg-background pl-9 pr-3 text-[12px] outline-none focus:border-primary"
                  />
                </div>
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as StatusFilter)
                  }
                  className="h-9 rounded-[6px] border border-border bg-background px-3 text-[12px] outline-none focus:border-primary"
                >
                  <option value="all">
                    {t("admin.services.all_statuses", {
                      defaultValue: "All statuses",
                    })}
                  </option>
                  <option value="active">
                    {t("admin.services.active_status", {
                      defaultValue: "Active",
                    })}
                  </option>
                  <option value="inactive">
                    {t("admin.services.inactive_status", {
                      defaultValue: "Inactive",
                    })}
                  </option>
                </select>
                <Button onClick={openCreate} className="rounded-[6px] h-8">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("admin.services.new_service", {
                    defaultValue: "New service",
                  })}
                </Button>
              </div>
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-[11px]">
                <thead className="border-b border-border/60 bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">
                      {t("admin.services.service", { defaultValue: "Service" })}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      {t("admin.services.redirect_url", {
                        defaultValue: "Explore URL",
                      })}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      {t("admin.services.order", { defaultValue: "Order" })}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      {t("admin.services.status", { defaultValue: "Status" })}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      {t("admin.services.actions", { defaultValue: "Actions" })}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <tr key={index} className="border-t border-border/40">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="h-12 animate-pulse rounded-[6px] bg-muted" />
                        </td>
                      </tr>
                    ))
                  ) : isError ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-destructive"
                      >
                        {t("admin.services.load_error", {
                          defaultValue: "Could not load services.",
                        })}
                      </td>
                    </tr>
                  ) : services.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        {t("admin.services.empty", {
                          defaultValue: "No services found yet.",
                        })}
                      </td>
                    </tr>
                  ) : (
                    services.map((service) => {
                      const description = richTextToPlainText(
                        service.description_en ||
                          service.description_fr ||
                          service.description_kiny,
                      );
                      return (
                        <tr
                          key={service.id}
                          className="border-t border-border/40 transition-colors hover:bg-secondary/20"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <ServiceImage service={service} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-[12px] font-semibold text-foreground">
                                    {service.title_en}
                                  </p>
                                  <StatusBadge active={service.is_active} />
                                </div>
                                <p className="mt-0.5 truncate text-[10px] font-semibold text-primary">
                                  {service.title_fr} / {service.title_kiny}
                                </p>
                                <p className="mt-0.5 max-w-xl truncate text-[10px] text-muted-foreground">
                                  {description || "-"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">
                            {service.redirect_url || "-"}
                          </td>
                          <td className="px-4 py-3 font-semibold text-foreground">
                            #{service.order ?? "-"}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge active={service.is_active} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-8 rounded-[6px] px-0"
                                onClick={() => setPreview(service)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <ServiceToggleButton service={service} />
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-8 rounded-[6px] px-0"
                                onClick={() => openEdit(service)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-8 rounded-[6px] px-0 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(service)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-3 lg:hidden">
              {isLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-24 animate-pulse rounded-[6px] border border-border/60 bg-card"
                    />
                  ))
                : services.map((service) => (
                    <div
                      key={service.id}
                      className="rounded-[6px] border border-border/60 bg-background p-3"
                    >
                      <div className="flex gap-3">
                        <ServiceImage service={service} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[12px] font-semibold text-foreground">
                              {service.title_en}
                            </p>
                            <StatusBadge active={service.is_active} />
                          </div>
                          <p className="mt-1 truncate text-[10px] font-semibold text-primary">
                            {service.title_fr} / {service.title_kiny}
                          </p>
                          <p className="mt-1 truncate text-[10px] text-muted-foreground">
                            #{service.order ?? "-"} -{" "}
                            {service.redirect_url || "-"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-[6px]"
                          onClick={() => setPreview(service)}
                        >
                          Preview
                        </Button>
                        <ServiceToggleButton service={service} />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-[6px]"
                          onClick={() => openEdit(service)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-[6px] text-destructive hover:text-destructive"
                          onClick={() => handleDelete(service)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
            </div>
          </section>
        </div>

        {modalOpen && (
          <ServiceFormModal
            service={editing}
            onClose={() => setModalOpen(false)}
          />
        )}
        {preview && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl overflow-hidden rounded-[6px] border border-border bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                <div className="flex items-center gap-3">
                  <ServiceImage service={preview} />
                  <div>
                    <h2 className="text-[14px] font-semibold text-foreground">
                      {preview.title_en}
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      {preview.redirect_url || "-"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="rounded-[6px] p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {preview.image_url && (
                <img
                  src={preview.image_url}
                  alt={preview.title_en}
                  className="max-h-72 w-full object-cover"
                />
              )}
              <div className="space-y-4 p-4">
                <RichTextRenderer
                  value={preview.description_en}
                  className="prose prose-sm max-w-none dark:prose-invert"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function ServiceToggleButton({ service }: { service: ApiService }) {
  const toggle = useToggleServiceActive(service.id);
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 rounded-[6px] px-2 text-[10px]"
      disabled={toggle.isPending}
      onClick={() => toggle.mutate()}
    >
      {service.is_active ? "Hide" : "Show"}
    </Button>
  );
}
