import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const months = Array.from({ length: 12 }, (_, index) =>
    new Intl.DateTimeFormat(i18n.language, { month: "short" }).format(new Date(2020, index, 1)),
  );
  const years: number[] = [];
  for (let year = endYear; year >= startYear; year -= 1) years.push(year);
  const current = displayMonth.getFullYear() * 12 + displayMonth.getMonth();
  const selectClass =
    "h-7 cursor-pointer rounded-[6px] border border-border/60 bg-background px-1.5 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="flex items-center justify-between gap-1">
      <button
        type="button"
        aria-label={t("common.previous_month", { defaultValue: "Previous month" })}
        disabled={current <= startYear * 12}
        onClick={() => onChange(shiftMonth(displayMonth, -1))}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 disabled:opacity-30",
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-1">
        <select
          aria-label={t("common.month", { defaultValue: "Month" })}
          value={displayMonth.getMonth()}
          onChange={(event) =>
            onChange(new Date(displayMonth.getFullYear(), Number(event.target.value), 1))
          }
          className={selectClass}
        >
          {months.map((label, index) => (
            <option key={label} value={index}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label={t("common.year", { defaultValue: "Year" })}
          value={displayMonth.getFullYear()}
          onChange={(event) =>
            onChange(new Date(Number(event.target.value), displayMonth.getMonth(), 1))
          }
          className={cn(selectClass, "w-[4.6rem]")}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        aria-label={t("common.next_month", { defaultValue: "Next month" })}
        disabled={current >= endYear * 12 + 11}
        onClick={() => onChange(shiftMonth(displayMonth, 1))}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 disabled:opacity-30",
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
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

  const goToMonth = (next: Date) => {
    const month = monthStart(next);
    if (!monthProp) setInnerMonth(month);
    onMonthChange?.(month);
  };

  return (
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
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
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
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
