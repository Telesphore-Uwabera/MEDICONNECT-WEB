import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

const FIRST_YEAR = 1900;
const LAST_YEAR = 2100;

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function selectedMonth(selected: CalendarProps["selected"]) {
  if (selected instanceof Date) return monthStart(selected);
  return undefined;
}

type PickerPanel = "month" | "decade" | "year" | null;

const CalendarPanelContext = React.createContext<{
  panel: PickerPanel;
  setPanel: (panel: PickerPanel) => void;
  decadeStart: number;
  setDecadeStart: (year: number) => void;
}>({ panel: null, setPanel: () => {}, decadeStart: 2020, setDecadeStart: () => {} });

function choiceClass(selected: boolean) {
  return cn(
    "h-8 min-w-0 truncate rounded-[6px] px-1 text-xs transition-colors",
    selected
      ? "bg-primary/5 font-semibold text-primary"
      : "text-foreground hover:bg-secondary/40",
  );
}

function MonthYearCaption({
  displayMonth,
  startYear,
  endYear,
  onChange,
}: {
  displayMonth: Date;
  startYear: number;
  endYear: number;
  onChange: (month: Date) => void;
}) {
  const { i18n, t } = useTranslation();
  const { panel, setPanel, decadeStart, setDecadeStart } = React.useContext(CalendarPanelContext);
  const months = Array.from({ length: 12 }, (_, index) =>
    new Intl.DateTimeFormat(i18n.language, { month: "short" }).format(new Date(2020, index, 1)),
  );
  const firstDecade = Math.floor(startYear / 10) * 10;
  const lastDecade = Math.floor(endYear / 10) * 10;
  const decades: number[] = [];
  for (let year = firstDecade; year <= lastDecade; year += 10) decades.push(year);
  const decadeYears: number[] = [];
  for (let year = decadeStart; year < decadeStart + 10; year += 1) {
    if (year >= startYear && year <= endYear) decadeYears.push(year);
  }
  const current = displayMonth.getFullYear() * 12 + displayMonth.getMonth();
  const triggerClass = (open: boolean) =>
    cn(
      "flex h-7 min-w-0 items-center justify-between gap-1 rounded-[6px] border bg-background px-1.5 text-xs font-medium outline-none",
      open
        ? "border-primary ring-2 ring-primary/20"
        : "border-border/60 hover:border-primary/50",
    );

  const openDecade = (year: number) => {
    setDecadeStart(Math.floor(year / 10) * 10);
    setPanel("year");
  };

  return (
    <div className="w-full min-w-[15.75rem] overflow-x-hidden">
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          aria-label={t("common.previous_month", { defaultValue: "Previous month" })}
          disabled={current <= startYear * 12}
          onClick={() => {
            setPanel(null);
            onChange(shiftMonth(displayMonth, -1));
          }}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 shrink-0 bg-transparent p-0 opacity-70 hover:opacity-100 disabled:opacity-30",
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
          <button
            type="button"
            aria-label={t("common.month", { defaultValue: "Month" })}
            aria-expanded={panel === "month"}
            onClick={() => setPanel(panel === "month" ? null : "month")}
            className={cn(triggerClass(panel === "month"), "w-[4.6rem]")}
          >
            <span className="truncate">{months[displayMonth.getMonth()]}</span>
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground/50" />
          </button>
          <button
            type="button"
            aria-label={t("common.year", { defaultValue: "Year" })}
            aria-expanded={panel === "decade" || panel === "year"}
            onClick={() => {
              if (panel === "decade" || panel === "year") {
                setPanel(null);
                return;
              }
              setDecadeStart(Math.floor(displayMonth.getFullYear() / 10) * 10);
              setPanel("decade");
            }}
            className={cn(triggerClass(panel === "decade" || panel === "year"), "w-[4.4rem]")}
          >
            <span className="truncate">{displayMonth.getFullYear()}</span>
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground/50" />
          </button>
        </div>
        <button
          type="button"
          aria-label={t("common.next_month", { defaultValue: "Next month" })}
          disabled={current >= endYear * 12 + 11}
          onClick={() => {
            setPanel(null);
            onChange(shiftMonth(displayMonth, 1));
          }}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 shrink-0 bg-transparent p-0 opacity-70 hover:opacity-100 disabled:opacity-30",
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {panel === "month" && (
        <div className="mt-2 grid w-full grid-cols-3 gap-1 overflow-x-hidden">
          {months.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                onChange(new Date(displayMonth.getFullYear(), index, 1));
                setPanel(null);
              }}
              className={choiceClass(index === displayMonth.getMonth())}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {panel === "decade" && (
        <div className="mt-2 grid w-full grid-cols-4 gap-1 overflow-x-hidden">
          {decades.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => openDecade(year)}
              className={choiceClass(
                displayMonth.getFullYear() >= year && displayMonth.getFullYear() < year + 10,
              )}
            >
              {year}
            </button>
          ))}
        </div>
      )}

      {panel === "year" && (
        <div className="mt-2 w-full overflow-x-hidden">
          <button
            type="button"
            onClick={() => setPanel("decade")}
            className="mb-1 text-xs font-medium text-primary hover:underline"
          >
            {decadeStart}–{Math.min(decadeStart + 9, endYear)}
          </button>
          <div className="grid w-full grid-cols-4 gap-1">
            {decadeYears.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => {
                  onChange(new Date(year, displayMonth.getMonth(), 1));
                  setPanel(null);
                }}
                className={choiceClass(year === displayMonth.getFullYear())}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  month: monthProp,
  onMonthChange,
  fromYear,
  toYear,
  fromDate,
  toDate,
  fromMonth,
  toMonth,
  defaultMonth,
  components,
  ...props
}: CalendarProps) {
  const startYear = fromYear ?? fromDate?.getFullYear() ?? fromMonth?.getFullYear() ?? FIRST_YEAR;
  const endYear = toYear ?? toDate?.getFullYear() ?? toMonth?.getFullYear() ?? LAST_YEAR;
  const [innerMonth, setInnerMonth] = React.useState(() =>
    monthStart(monthProp ?? defaultMonth ?? selectedMonth(props.selected) ?? new Date()),
  );
  const displayMonth = monthProp ? monthStart(monthProp) : innerMonth;
  const [panel, setPanel] = React.useState<PickerPanel>(null);
  const [decadeStart, setDecadeStart] = React.useState(() =>
    Math.floor(displayMonth.getFullYear() / 10) * 10,
  );

  const goToMonth = (next: Date) => {
    const month = monthStart(next);
    if (!monthProp) setInnerMonth(month);
    onMonthChange?.(month);
  };

  return (
    <CalendarPanelContext.Provider value={{ panel, setPanel, decadeStart, setDecadeStart }}>
    <DayPicker
      showOutsideDays={showOutsideDays}
      month={displayMonth}
      onMonthChange={goToMonth}
      fromDate={fromDate ?? new Date(startYear, 0, 1)}
      toDate={toDate ?? new Date(endYear, 11, 31)}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "block w-full min-w-0 pt-1",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: cn("w-full border-collapse space-y-1", panel && "hidden"),
        head: panel ? "hidden" : undefined,
        head_row: cn("flex w-full mt-2", panel && "hidden"),
        head_cell:
          "text-muted-foreground rounded-[6px] w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-[6px] [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-[6px] focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
        ...components,
        Caption: ({ displayMonth: shownMonth }) => (
          <MonthYearCaption
            displayMonth={shownMonth}
            startYear={startYear}
            endYear={endYear}
            onChange={goToMonth}
          />
        ),
      }}
      {...props}
    />
    </CalendarPanelContext.Provider>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
