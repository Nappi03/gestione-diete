import React from 'react';
import { SheetState, WeekDay, MealColumns, mealFieldOrder } from '../lib/sheet';

export function PrintableSheet({ sheet }: { sheet: SheetState }) {
  return (
    <div className="space-y-6">
      <PrintablePage withHeader sheet={sheet} days={sheet.days} includeFooter />
    </div>
  );
}

export function PrintablePage({
  sheet,
  days,
  withHeader = false,
  includeFooter = false,
}: {
  sheet: SheetState;
  days: WeekDay[];
  withHeader?: boolean;
  includeFooter?: boolean;
}) {
  return (
    <article className="print-page print-sheet mx-auto bg-white p-0 text-black">
      {withHeader ? (
        <div className="mb-2 flex items-start justify-between gap-6">
          <div className="pl-[4mm] pt-[1mm]">
            <p className="text-[18px] font-bold italic leading-tight text-black">
              {sheet.protocolTitle}
            </p>
            <p className="mt-1 text-[22px] font-bold uppercase leading-tight text-black">
              {sheet.weekTitle}
            </p>
            <p className="mt-1 text-[18px] font-bold uppercase leading-tight text-black">
              PAZIENTE: {sheet.patientName}
            </p>
          </div>
          <p className="pt-[6mm] text-right text-[14px] italic text-black">
            {sheet.topNote}
          </p>
        </div>
      ) : null}

      <div className={withHeader ? 'mt-1' : 'pt-[1mm]'}>
        <DietTable sheet={sheet} days={days} showHeader={withHeader} />
      </div>

      {includeFooter ? (
        <div className="pt-4 text-right text-[15px] italic leading-tight text-black">
          <p>{sheet.footerLine1}</p>
          <p>{sheet.footerLine2}</p>
        </div>
      ) : null}
    </article>
  );
}

export function DietTable({
  sheet,
  days,
  showHeader,
}: {
  sheet: SheetState;
  days: WeekDay[];
  showHeader: boolean;
}) {
  return (
    <table className="w-full table-auto border-collapse border border-neutral-500 text-[12px] leading-[1.18] text-black">
      {showHeader ? (
        <thead>
          <tr>
            <th className="border border-neutral-500 px-2 py-2 text-[14px] font-normal uppercase tracking-[0.02em]">
              GIORNI
            </th>
            <th className="border border-neutral-500 px-2 py-2 text-[14px] font-normal uppercase tracking-[0.02em]">
              COLAZIONE
            </th>
            <th className="border border-neutral-500 px-2 py-2 text-[14px] font-normal uppercase tracking-[0.02em]">
              SPUNTINO
            </th>
            <th className="border border-neutral-500 px-2 py-2 text-[14px] font-normal uppercase tracking-[0.02em]">
              PRANZO
            </th>
            <th className="border border-neutral-500 px-2 py-2 text-[14px] font-normal uppercase tracking-[0.02em]">
              MERENDA
            </th>
            <th className="border border-neutral-500 px-2 py-2 text-[14px] font-normal uppercase tracking-[0.02em]">
              CENA
            </th>
          </tr>
        </thead>
      ) : null}
      <tbody>
        {showHeader ? (
          <tr>
            <td className="border border-neutral-500 px-2 py-2 text-center text-[15px] font-bold whitespace-pre-line">
              TUTTI{`\n`}I{`\n`}GIORNI
            </td>
            {mealFieldOrder.map((field) => (
              <td
                key={`fixed-${field}`}
                className="border border-neutral-500 px-2 py-2 text-center text-[14px] font-bold uppercase whitespace-pre-line"
              >
                {sheet.fixedRow[field]}
              </td>
            ))}
          </tr>
        ) : null}
        {days.map((day) => (
          <tr key={day.id}>
            <td className="border border-neutral-500 px-2 py-2 text-center text-[14px] font-normal uppercase whitespace-pre-line">
              {day.label}
            </td>
            {mealFieldOrder.map((field) => {
              const content = day.meals[field as keyof MealColumns];
              return (
                <td
                  key={`${day.id}-${field}`}
                  className="border border-neutral-500 px-2 py-2 align-top whitespace-pre-line"
                >
                  {content}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
