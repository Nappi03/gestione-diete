export type MealColumns = {
  colazione: string;
  spuntino: string;
  pranzo: string;
  merenda: string;
  cena: string;
};

export type WeekDay = {
  id: string;
  label: string;
  meals: MealColumns;
};

export type SheetState = {
  protocolTitle: string;
  weekTitle: string;
  patientName: string;
  topNote: string;
  footerLine1: string;
  footerLine2: string;
  fixedRow: MealColumns;
  days: WeekDay[];
};

export const mealFieldOrder: Array<keyof MealColumns> = [
  "colazione",
  "spuntino",
  "pranzo",
  "merenda",
  "cena",
];

const createDay = (
  id: string,
  label: string,
  meals: MealColumns,
): WeekDay => ({
  id,
  label,
  meals,
});

export const createInitialSheet = (): SheetState => ({
  protocolTitle: "Protocollo IpoCalorico:",
  weekTitle: "PRIMA SETTIMANA",
  patientName: "TINA DE MARTINO",
  topNote: "*dose giornaliera di sale max 5gr",
  footerLine1: "Biologa Nutrizionista",
  footerLine2: "Dott.ssa Nappi Maria",
  fixedRow: {
    colazione: "BEVI 4 BICCHIERI DI\nACQUA NATURALE\nPRIMA DI FARE COLAZIONE",
    spuntino: "BEVI 2\nBICCHIERI DI\nACQUA",
    pranzo: "BEVI 4\nBICCHIERI DI ACQUA\nNATURALE",
    merenda: "BEVI 2 BICCHIERI\nDI ACQUA\nNATURALE",
    cena: "BEVI 4\nBICCHIERI DI ACQUA\nNATURALE",
  },
  days: [
    createDay("lunedi", "LUNEDÌ", {
      colazione:
        "140ml di latte zymil tappo verde amaro con\n*4biscotti della Misura o Galbusera o Orosaiwa\nsenza zuccheri aggiunti o 2biscotti della Gullon\n(Digestive) senza zuccheri aggiunti o\n*2fette biscottate integrali con 10gr di\nmarmellata Hero o\n*20gr di conflakes Kellogg's o Misura senza\nzuccheri aggiunti.",
      spuntino:
        "*10gr di\nfrutta secca o\n*1frutto o\n*10gr di\ncioccolata\nfondente dal\n75%",
      pranzo:
        "100gr di prosciutto crudo\nContorno: lattuga con\nfinocchio, carota e 4olive\n1panino medio (rosetta)\nCondimento: 10gr o 2\ncucchiaini di olio EVO\n1 frutto(DOPO 30MINUTI)",
      merenda:
        "*Yogurt bianco Kefir o zymil con 5gr\ndi frutta secca o\n*Yogurt alla frutta o vari gusti\nTrublend (Fage) o Kefir o\n*1frutto di stagione o\n*2giallette Gullon ricoperte di\ncioccolato fondente o yogurt o\n*20gr triangalini mais o legume",
      cena:
        "150gr di bistecca di pollo\nContorno: 300gr di melanzane\narrostite\n60gr di pane di segale tostato\nCondimento: 10gr o 2\ncucchiaini di olio EVO\n1 frutto ( DOPO 30 MINUTI)",
    }),
    createDay("martedi", "MARTEDÌ", {
      colazione:
        "140ml di latte zymil tappo verde amaro con\n*4biscotti della Misura o Galbusera o Orosaiwa\nsenza zuccheri aggiunti o 2biscotti della Gullon\n(Digestive) senza zuccheri aggiunti o\n*2fette biscottate integrali con 10gr di\nmarmellata Hero o\n*20gr di conflakes Kellogg's o Misura senza\nzuccheri aggiunti.",
      spuntino:
        "*10gr di\nfrutta secca o\n*1frutto o\n*10gr di\ncioccolata\nfondente dal\n75%",
      pranzo:
        "60gr di pasta con 80gr\n(peso secco) o 8cucchiai\n(peso cotto) con fagioli o\nlenticchie\nCondimento: 10gr o 2\ncucchiaini di olio EVO\n1 frutto(DOPO 30 MINUTI)",
      merenda:
        "*Yogurt bianco Kefir o zymil con 5gr\ndi frutta secca o\n*Yogurt alla frutta o vari gusti\nTrublend (Fage) o Kefir o\n*1frutto di stagione o\n*2giallette Gullon ricoperte di\ncioccolato fondente o yogurt o\n*20gr triangalini mais o legume",
      cena:
        "200gr di seppie e calamari al\nvapore o filetti di merluzzo\nContorno: 250gr di fagiolini\nall'insalata con 1patata piccola\nCondimento: 10gr o 2\ncucchiaini di olio EVO\n1 frutto ( DOPO 30 MINUTI)",
    }),
    createDay("mercoledi", "MERCOLEDÌ", {
      colazione:
        "140ml di latte zymil tappo verde amaro con\n*4biscotti della Misura o Galbusera o Orosaiwa\nsenza zuccheri aggiunti o 2biscotti della Gullon\n(Digestive) senza zuccheri aggiunti o\n*2fette biscottate integrali con 10gr di\nmarmellata Hero o\n*20gr di conflakes Kellogg's o Misura senza\nzuccheri aggiunti.",
      spuntino:
        "*10gr di\nfrutta secca o\n*1frutto o\n*10gr di\ncioccolata\nfondente dal\n75%",
      pranzo:
        "50gr di pasta all'insalata\ncon pomodorini\nall'insalata, 40gr di\nprosciutto cotto e scaglie di\ngrana\nCondimento: 10gr o 2\ncucchiaini di olio EVO\n1 frutto(DOPO 30 MINUTI)",
      merenda:
        "*Yogurt bianco Kefir o zymil con 5gr\ndi frutta secca o\n*Yogurt alla frutta o vari gusti\nTrublend (Fage) o Kefir o\n*1frutto di stagione o\n*2giallette Gullon ricoperte di\ncioccolato fondente o yogurt o\n*20gr triangalini mais o legume",
      cena:
        "150gr straccetti pollo arrostito\nContorno: scarola riccia alla\ncon pomodorini e zucchine\narrostite\n50gr di pane di segale tostato\nCondimento: 10gr o 2\ncucchiaini di olio EVO\n1 frutto ( DOPO 30 MINUTI)",
    }),
    createDay("giovedi", "GIOVEDÌ", {
      colazione:
        "140ml di latte zymil tappo verde amaro con\n*4biscotti della Misura o Galbusera o Orosaiwa\nsenza zuccheri aggiunti o 2biscotti della Gullon\n(Digestive) senza zuccheri aggiunti o\n*2fette biscottate integrali con 10gr di\nmarmellata Hero o\n*20gr di conflakes Kellogg's o Misura senza\nzuccheri aggiunti.",
      spuntino:
        "*10gr di\nfrutta secca o\n*1frutto o\n*10gr di\ncioccolata\nfondente dal\n75%",
      pranzo:
        "1scatoletta di tonno a filo\nd'olio\nContorno: 200gr di\npomodorini all'insalata\n1fresella integrale di 50gr\nCondimento: 10gr oppure\n2 cucchiaini di olio EVO\n2 frutto(DOPO 30 MINUTI)",
      merenda:
        "*Yogurt bianco Kefir o zymil con 5gr\ndi frutta secca o\n*Yogurt alla frutta o vari gusti\nTrublend (Fage) o Kefir o\n*1frutto di stagione o\n*2giallette Gullon ricoperte di\ncioccolato fondente o yogurt o\n*20gr triangalini mais o legume",
      cena:
        "150gr di carne di manzo\narrostita\nContorno: lattuga con\nfinocchio all'insalata\n60gr di pane di segale tostato\nCondimento: 10gr o 2\ncucchiaini di olio EVO\n1 frutto (DOPO 30MINUTI)",
    }),
    createDay("venerdi", "VENERDÌ", {
      colazione:
        "140ml di latte zymil tappo verde amaro con\n*4biscotti della Misura o Galbusera o Orosaiwa\nsenza zuccheri aggiunti o 2biscotti della Gullon\n(Digestive) senza zuccheri aggiunti o\n*2fette biscottate integrali con 10gr di\nmarmellata Hero o\n*20gr di conflakes Kellogg's o Misura senza\nzuccheri aggiunti.",
      spuntino:
        "*10gr di\nfrutta secca o\n*1frutto o\n*10gr di\ncioccolata\nfondente dal\n75%",
      pranzo:
        "50gr di riso basmati con\n80gr di piselli freschi e 5gr\ndi grana grattugiata\nCondimento: 10gr o 2\ncucchiaini di olio EVO\n1 frutto(DOPO 30MINUTI)",
      merenda:
        "*Yogurt bianco Kefir o zymil con 5gr\ndi frutta secca o\n*Yogurt alla frutta o vari gusti\nTrublend (Fage) o Kefir o\n*1frutto di stagione o\n*2giallette Gullon ricoperte di\ncioccolato fondente o yogurt o\n*20gr triangalini mais o legume",
      cena:
        "Panino medio (rosetta) con\nfrittata con 2uova e 5gr di\ngrana grattugiata\nContorno: spinaci o broccoli\nall'insalata\nCondimento: 10gr oppure 2\ncucchiaini di olio EVO\n1 frutto (DOPO 30 MINUTI)",
    }),
    createDay("sabato", "SABATO", {
      colazione:
        "140ml di latte zymil tappo verde amaro con\n*4biscotti della Misura o Galbusera o Orosaiwa\nsenza zuccheri aggiunti o 2biscotti della Gullon\n(Digestive) senza zuccheri aggiunti o\n*2fette biscottate integrali con 10gr di\nmarmellata Hero o\n*20gr di conflakes Kellogg's o Misura senza\nzuccheri aggiunti.",
      spuntino:
        "*10gr di\nfrutta secca o\n*1frutto o\n*10gr di\ncioccolata\nfondente dal\n75%",
      pranzo:
        "Panino con 50gr di\ntacchino con melanzane\narrostite\nCondimento: 10gr o 2\ncucchiaini di olio EVO\n1 frutto(DOPO 30MINUTI)",
      merenda:
        "*Yogurt bianco Kefir o zymil con 5gr\ndi frutta secca o\n*Yogurt alla frutta o vari gusti\nTrublend (Fage) o Kefir o\n*1frutto di stagione o\n*2giallette Gullon ricoperte di\ncioccolato fondente o yogurt o\n*20gr triangalini mais o legume",
      cena:
        "1saltimbocca con 80gr di\nprosciutto cotto\nContorno: verdure grigliate\ncon lattuga\nCondimento: 10gr oppure 2\ncucchiaino di olio EVO\n1 frutto(DOPO30MINUTI)",
    }),
    createDay("domenica", "DOMENICA", {
      colazione:
        "140ml di latte zymil tappo verde amaro con\n*4biscotti della Misura o Galbusera o Orosaiwa\nsenza zuccheri aggiunti o 2biscotti della Gullon\n(Digestive) senza zuccheri aggiunti o\n*2fette biscottate integrali con 10gr di\nmarmellata Hero o\n*20gr di conflakes Kellogg's o Misura senza\nzuccheri aggiunti.",
      spuntino:
        "*10gr di\nfrutta secca o\n*1frutto o\n*10gr di\ncioccolata\nfondente dal\n75%",
      pranzo:
        "1porzione di pasta con\npassato di pomodoro e\nragu o con pomodorini e\nfrutti di mare\nContorno: peperoni q.b.\nCondimento: 10gr o 2\ncucchiaini di olio EVO\n1 frutto(DOPO30MINUTI)",
      merenda:
        "*Yogurt bianco Kefir o zymil con 5gr\ndi frutta secca o\n*Yogurt alla frutta o vari gusti\nTrublend (Fage) o Kefir o\n*1frutto di stagione o\n*2giallette Gullon ricoperte di\ncioccolato fondente o yogurt o\n*20gr triangalini mais o legume",
      cena:
        "Toast con 2fette di pan\nbauletto con 40gr di fesa di\ntacchino\n1 frutto(DOPO30MINUTI)",
    }),
  ],
});

export function fieldLabel(field: keyof MealColumns) {
  switch (field) {
    case "colazione":
      return "Colazione";
    case "spuntino":
      return "Spuntino";
    case "pranzo":
      return "Pranzo";
    case "merenda":
      return "Merenda";
    case "cena":
      return "Cena";
  }
}
