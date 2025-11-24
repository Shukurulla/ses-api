const pdf = require("pdf-parse");
const fs = require("fs").promises;

/**
 * Type 1 PDF Parser: Yuqumli va Parazitar Kasalliklar O'chog'in Epidemiologik Tekshirish Kartasi
 */

/**
 * Yordamchi funksiyalar
 */
function clean(str = "") {
  let s = String(str).replace(/\s+/g, " ").trim();

  // Harf + raqam / raqam + harf orasiga bo'sh joy
  s = s.replace(/([A-Za-zА-Яа-яЁёʻ’ʼ`'])([0-9])/g, "$1 $2");
  s = s.replace(/([0-9])([A-Za-zА-Яа-яЁё])/g, "$1 $2");

  // kichik harf + katta harf orasiga bo'sh joy
  s = s.replace(/([a-zа-яёўқғҳ])([A-ZА-ЯЁЎҚҒҲ])/g, "$1 $2");

  return s;
}

function extract(text, regex) {
  const m = text.match(regex);
  return m ? clean(m[1]) : "";
}

function between(text, start, end) {
  const i = text.indexOf(start);
  if (i === -1) return "";
  const from = i + start.length;
  let j = end ? text.indexOf(end, from) : -1;
  if (j === -1) j = text.length;
  return clean(text.substring(from, j));
}

/**
 * 17–21 bandlardagi sanalar blokini ajratish
 */
function extractTimelineDates(text) {
  const block = between(
    text,
    "17. Kasallangan",
    "22. Yotqizilgan kasalxona, qaysi transport vositasi bilan"
  );
  const flat = block.replace(/\s+/g, " ");
  const matches = flat.match(/\d{2}-\d{2}-\d{4}(?:\s+\d{2}:\d{2})?/g) || [];

  return {
    kasallangan_sana: matches[0] || "",
    murojaat_vaqti: matches[1] || "",
    shoshilinch_xabarnoma_sana: matches[2] || "",
    kasalxonaga_yotqizilgan_sana: matches[3] || "",
    yakunlovchi_tashxis_sana: matches[4] || "",
  };
}

/**
 * Hamma fieldlar uchun umumiy ta'rif
 */
const FIELD_DEFS = [
  {
    label: "№",
    getValue: (text) => extract(text, /(?:№|No)\s+(\d+)/),
  },
  {
    label: "Birlamchi tashxis",
    getValue: (text) =>
      between(
        text,
        "1. Birlamchi tashxis",
        "2. Kasallik qo‘zg‘atuvchisining turi, xili"
      ),
  },
  {
    label: "Kasallik qo'zg'atuvchisining turi, xili",
    getValue: (text) =>
      between(text, "2. Kasallik qo‘zg‘atuvchisining turi, xili", "3. Bemor:"),
  },
  {
    label: "Bemor (shu yerlik / boshqa joydan kelgan)",
    getValue: (text) => extract(text, /3\. Bemor:\s*([^\n]+)/),
  },
  {
    label: "F.I.SH",
    getValue: (text) => between(text, "4. F.I.SH", "5. Jinsi"),
  },
  {
    label: "Jinsi",
    getValue: (text) => between(text, "5. Jinsi", "6. Tug‘ilgan sanasi"),
  },
  {
    label: "Tug'ilgan sanasi",
    getValue: (text) =>
      between(text, "6. Tug‘ilgan sanasi", "7. Doimiy yashash joyi"),
  },
  {
    label: "Doimiy yashash joyi",
    getValue: (text) => {
      const m = text.match(/7\. Doimiy yashash joyi:\s*([^\n]+)\n([^\n]+)/);
      return m ? clean(m[1] + " " + m[2]) : "";
    },
  },
  {
    label: "Hozirgi yashash joyi",
    getValue: (text) => {
      const m = text.match(/8\. Hozirgi yashash joyi:\s*([^\n]+)\n([^\n]+)/);
      return m ? clean(m[1] + " " + m[2]) : "";
    },
  },
  {
    label: "Ishlash, o'qish joyi, bog'cha",
    getValue: (text) =>
      between(
        text,
        "9. Ishlash, o‘qish joyi, bog‘cha",
        "10. Ishlash, o‘qish joyiga, bog‘chaga so‘ngi marta borgan vaqti"
      ),
  },
  {
    label: "Ishlash, o'qish joyiga, bog'chaga so'ngi marta borgan vaqti",
    getValue: (text) =>
      between(
        text,
        "10. Ishlash, o‘qish joyiga, bog‘chaga so‘ngi marta borgan vaqti",
        "11. Turar joyi bo‘yicha davolash muassasasi"
      ),
  },
  {
    label: "Turar joyi bo'yicha davolash muassasasi",
    getValue: (text) =>
      between(
        text,
        "11. Turar joyi bo‘yicha davolash muassasasi:",
        "12. Bemor haqida habar olinganligi (kuni, soati)"
      ),
  },
  {
    label: "Bemor haqida habar olinganligi (kuni, soati, shakli)",
    getValue: (text) =>
      extract(
        text,
        /12\. Bemor haqida habar olinganligi \(kuni, soati\)\s*([0-9\- :]+)/
      ),
  },
  {
    label: "Kim tomonidan yuborilgan (muassasa nomi)",
    getValue: (text) =>
      extract(
        text,
        /13\. Kim tomonidan yuborilgan \(muassasa nomi\)\s*([^\n]+)/
      ),
  },
  {
    label: "Kasallikning birinchi kunlaridagi asosiy belgilari",
    getValue: (text) =>
      extract(
        text,
        /14\. Kasallikning birinchi kunlaridagi asosiy belgilari\s*([^\n]+)/
      ),
  },
  {
    label: "Bemor aniqlandi",
    getValue: (text) => extract(text, /15\. Bemor aniqlandi\s*([^\n]+)/),
  },
  {
    label: "Epidemiologik tekshiruv o'tkazilgan vaqt (kuni, soati)",
    getValue: (text) =>
      between(
        text,
        "16. Epidemiologik tekshiruv o‘tkazilgan vaqt (kuni, soati)",
        "Kuzatuv tamomlangan vaqt"
      ),
  },
  {
    label: "Kuzatuv tamomlangan vaqt",
    getValue: (text) =>
      extract(text, /Kuzatuv tamomlangan vaqt\s*([0-9\- :]+)/),
  },

  // 17–21: timeline
  {
    label: "Kasallangan sana",
    getValue: (text) => extractTimelineDates(text).kasallangan_sana,
  },
  {
    label: "Murojaat etgan vaqt",
    getValue: (text) => extractTimelineDates(text).murojaat_vaqti,
  },
  {
    label: "Shoshilinch xabarnoma yuborilganda tashxis qo'yilgan sana",
    getValue: (text) => extractTimelineDates(text).shoshilinch_xabarnoma_sana,
  },
  {
    label: "Kasalxonaga yotqizilgan sana",
    getValue: (text) => extractTimelineDates(text).kasalxonaga_yotqizilgan_sana,
  },
  {
    label: "Yakunlovchi tashxis qo'yilgan sana",
    getValue: (text) => extractTimelineDates(text).yakunlovchi_tashxis_sana,
  },

  {
    label: "Yotqizilgan kasalxona, qaysi transport vositasi bilan",
    getValue: (text) =>
      extract(
        text,
        /22\. Yotqizilgan kasalxona, qaysi transport vositasi bilan\s*([^\n]+)/
      ),
  },
  {
    label: "Uyida qoldirilish (sababi)",
    getValue: (text) =>
      extract(text, /23\. Uyida qoldirilish \(sababi\):\s*([^\n]+)/),
  },
  {
    label: "Kech yotqizilish sabablari",
    getValue: (text) =>
      between(
        text,
        "24. Kech yotqizilish sabablari",
        "25. Laboratoriya tekshiruvi"
      ),
  },
  {
    label: "Laboratoriya tekshiruvi",
    getValue: (text) =>
      extract(text, /25\. Laboratoriya tekshiruvi:\s*([^\n]+)/),
  },
  {
    label:
      "Oxirgi emlash haqida ma'lumot (rejali, epidemik o'rsatma, vaqti, dozasi, preparat nomi, seriyasi)",
    getValue: (text) =>
      between(
        text,
        "26. Oxirgi emlash haqida ma'lumot (rejali, epidemik o‘rsatma bo‘yicha, vaqti, dozasi preparat nomi, seriyasi)",
        "II. KASALLIKNI YUQISHIDAGI MANBANI"
      ),
  },

  // II bo'lim
  {
    label: "Taxminiy yuqqan muddati",
    getValue: (text) =>
      between(
        text,
        "27. Taxminiy yuqqan muddati:",
        "28. Kasallik yuqish mumkin bo‘lgan muddat oralig‘ida bemor bo‘lgan noqulay shart-sharoitlarning kasallik ro‘y berishidagi"
      ),
  },
  {
    label:
      "Kasallik yuqish mumkin bo'lgan muddat oralig'ida bemor bo'lgan noqulay shart-sharoitlarning ahamiyati",
    getValue: (text) =>
      between(
        text,
        "28. Kasallik yuqish mumkin bo‘lgan muddat oralig‘ida bemor bo‘lgan noqulay shart-sharoitlarning kasallik ro‘y berishidagi",
        "29. Kasallik manbai bo‘lishi mumkin bo‘lgan shaxslar"
      ),
  },
  {
    label: "Kasallik manbai bo'lishi mumkin bo'lgan shaxslar",
    getValue: (text) =>
      between(
        text,
        "29. Kasallik manbai bo‘lishi mumkin bo‘lgan shaxslar",
        "30. Bu kasallikni kelib chiqishida ahamiyati bo‘lgan suv, oziq-ovqat mahsulotlari xaqidagi ma‘lumotlar"
      ),
  },
  {
    label: "Suv va oziq-ovqat mahsulotlari haqidagi ma'lumotlar",
    getValue: (text) =>
      between(
        text,
        "30. Bu kasallikni kelib chiqishida ahamiyati bo‘lgan suv, oziq-ovqat mahsulotlari xaqidagi ma‘lumotlar",
        "SHU KASAL BILAN BOG‘LIQ CHEGARALANGAN O‘CHOQNING SANITAR GIGIYENIK"
      ),
  },

  // A. Yashash joyi bo'yicha
  {
    label: "Yashash sharoiti",
    getValue: (text) => extract(text, /31\. Yashash sharoiti\s*([^\n]+)/),
  },
  {
    label: "Zichligi (kishilar/xonalar/maydoni)",
    getValue: (text) =>
      extract(
        text,
        /32\. Zichligi:\s*Kishilar soni\s*([0-9]+)\s+Xonalar soni\s*([0-9]+)\s+Maydoni\s*([0-9]+)/
      ),
  },
  {
    label: "Zichligi - Kishilar soni",
    getValue: (text) =>
      extract(text, /32\. Zichligi:\s*Kishilar soni\s*([0-9]+)/),
  },
  {
    label: "Zichligi - Xonalar soni",
    getValue: (text) => extract(text, /Xonalar soni\s*([0-9]+)\s+Maydoni/),
  },
  {
    label: "Zichligi - Maydoni",
    getValue: (text) => extract(text, /Maydoni\s*([0-9]+)/),
  },
  {
    label: "Suv bilan ta'minlanishi",
    getValue: (text) =>
      extract(text, /33\. Suv bilan ta‘minlanishi\s*([^\n]+)/),
  },
  {
    label: "Suyuq chiqindilardan tozalash, yig'ish turi",
    getValue: (text) =>
      extract(
        text,
        /34\. Suyuq chiqindilardan tozalash, yig‘ish turi\s*([^\n]+)/
      ),
  },
  {
    label: "Qattiq chiqindilarni tozalash",
    getValue: (text) =>
      extract(text, /35\. Qattiq chiqindilarni tozalash\s*([^\n]+)/),
  },
  {
    label: "Xonadonda sanitar holatni saqlash (xonalar/xovli/hududida)",
    getValue: (text) =>
      extract(text, /36\. Xonadonda sanitar xolatni saqlash:\s*([^\n]+)/),
  },
  {
    label: "Bitlash borligi",
    getValue: (text) =>
      extract(text, /37\. Bitlash borligi\s*([^\n]+)\s+Boshqa hashoratlar/),
  },
  {
    label: "Boshqa hashoratlar",
    getValue: (text) =>
      extract(text, /Boshqa hashoratlar\s*([^\n]+)\s+Kemiruvchilar/),
  },
  {
    label: "Kemiruvchilar",
    getValue: (text) => extract(text, /Kemiruvchilar\s*([^\n]+)/),
  },
  {
    label:
      "Kasallikni kelib chiqishida muhim bo'lgan sabablar (A. yashash joyi)",
    getValue: (text) =>
      between(
        text,
        "38. Kasallikni kelib chiqishida muhim bo‘lgan sabablar",
        "B. ISH, O‘QISH, TARBIYA"
      ),
  },

  // B. Ish, o'qish va h.k.
  {
    label:
      "Bemor bo'lgan ob'ektlar nomi (ish/o'qish/tarbiya/dam olish/davolash joylari)",
    getValue: (text) =>
      between(
        text,
        "39. Bemor bo‘lgan ob‘ektlar nomi, uning bo‘limlari tarkibi (tsexlar, sinflar, guruhlar va boshqalar)",
        "40. Sanitar – gigienik va epidemiyaga qarshi talablar ga javob berishi"
      ),
  },
  {
    label:
      "Sanitar–gigienik va epidemiyaga qarshi talablarga javob berishi (ish/o'qish joylari bo'yicha)",
    getValue: (text) =>
      between(
        text,
        "40. Sanitar – gigienik va epidemiyaga qarshi talablar ga javob berishi:",
        "41. Kasallikni keltirib chiqargan omillar"
      ),
  },
  {
    label: "Kasallikni keltirib chiqar gan omillar",
    getValue: (text) =>
      extract(text, /41\. Kasallikni keltirib chiqargan omillar\s*([^\n]+)/),
  },
  {
    label:
      "Tashqi muhit materiallarini laboratorik tekshiruv (obyektlar, bo'g'imoyoqlilar, hayvonlar)",
    getValue: (text) => {
      const block = between(
        text,
        "42. Tashqi muhit materiallarini laboratorik tekshiruvi",
        "III. O‘СHOQNI TUGATISHDAGI СHORA-TADBIRLAR"
      );
      // agar ichida "Ma'lumot yo'q" bo'lsa, faqat shuni qaytaramiz
      const m = block.match(/Ma[‘']lumot yo[‘']q/);
      return m ? clean(m[0]) : block;
    },
  },

  // III. O'choqni tugatishdagi chora-tadbirlar
  {
    label:
      "Bemor bilan muloqatda bo'lganlar yoki kasallanishi ehtimol bo'lgan shaxslarni kuzatish",
    getValue: (text) =>
      between(
        text,
        "43. Bemor bilan muloqatda bo‘lganlar yoki o‘sha sharoitda kasallanishi ehtimol bo‘lgan shaxslarni kuzatish",
        "44. Mahsus profilaktik chora tadbirlar va tashkillashgan jamoalarda shaxslarni tekshiruv"
      ),
  },
  {
    label:
      "Mahsus profilaktik chora tadbirlar (tashkil etilgan jamoalarda shaxslarni tekshiruv)",
    getValue: (text) => {
      const block = between(
        text,
        "44. Mahsus profilaktik chora tadbirlar va tashkillashgan jamoalarda shaxslarni tekshiruv",
        "46. Kasallik o‘chog‘ida kasallikni boshqalarga yuqish mexanizmini uzishga qaratilgan choralar"
      );
      const m = block.match(/Ma[‘']lumot yo[‘']q/);
      return m ? clean(m[0]) : block;
    },
  },
  {
    label:
      "Kasallik o'chog'ida kasallikni boshqalarga yuqish mexanizmini uzishga qaratilgan choralar",
    getValue: (text) =>
      between(
        text,
        "46. Kasallik o‘chog‘ida kasallikni boshqalarga yuqish mexanizmini uzishga qaratilgan choralar",
        "47. Bemor yotqizilgan kasalxona nomi"
      ),
  },
  {
    label: "Bemor yotqizilgan kasalxona nomi",
    getValue: (text) =>
      between(
        text,
        "47. Bemor yotqizilgan kasalxona nomi",
        "IV. EPIDEMIOLOGIK TEKSHIRUV XULOSASI"
      ),
  },

  // IV. Epidemiologik tekshiruv xulosasi
  {
    label: "Kasallik chaqiruvchisini yuqtirishga gumon qilingan joy",
    getValue: (text) =>
      extract(
        text,
        /1\. Kasallik chaqiruvchisini yuqtirishga gumon qilingan joy\s*([^\n]+)/
      ),
  },
  {
    label: "Kasallikni yuqtirilishi ehtimol qilingan joy",
    getValue: (text) =>
      extract(
        text,
        /2\. Kasallikni yuqtirilishi ehtimol qilingan joy\s*([^\n]+)/
      ),
  },
  {
    label: "Gumon qilingan kasallik manbai",
    getValue: (text) =>
      between(
        text,
        "3. Gumon qilingan kasallik manbai",
        "4. Kasallik chaqiruvchisini yuqtirishga ehtimol qilingan asosiy faktor"
      ),
  },
  {
    label:
      "Kasallik chaqiruvchisini yuqtirishga ehtimol qilingan asosiy faktor",
    getValue: (text) =>
      between(
        text,
        "4. Kasallik chaqiruvchisini yuqtirishga ehtimol qilingan asosiy faktor",
        "5. Kasallikni yuqtirishga sabab bo‘lgan sharoitlar"
      ),
  },
  {
    label: "Kasallikni yuqtirishga sabab bo'lgan sharoitlar",
    getValue: (text) =>
      between(
        text,
        "5. Kasallikni yuqtirishga sabab bo‘lgan sharoitlar",
        "6. O‘chog‘dagi kasallanish"
      ),
  },
  {
    label: "O'chog'dagi kasallanish (A va B)",
    getValue: (text) =>
      between(
        text,
        "6. O‘chog‘dagi kasallanish",
        "Kartani medstatistikka topshirilgan vaqt"
      ),
  },
  {
    label: "Kartani medstatistikka topshirilgan vaqt",
    getValue: (text) =>
      extract(text, /Kartani medstatistikka topshirilgan vaqt\s*([0-9\-]+)/),
  },

  // Epidemiolog vrach (oxiri)
  {
    label: "Epidemiolog vrach",
    getValue: (text) => {
      const m = text.match(/Epidemiolog vrach\s*([^\n]+)\n([^\n]+)/);
      if (!m) return "";
      let full = clean(m[1] + " " + m[2]);
      full = full.replace(/\d{2}\.\d{2}\.\d{4}.*/, "").trim();
      return full;
    },
  },
  {
    label: "Hujjat havolasi (1-sahifa)",
    getValue: (text) =>
      extract(
        text,
        /(https:\/\/ykem\.sanepid\.uz\/document\/user\/incomings1\/4)/
      ),
  },
  {
    label: "Hujjat havolasi (2-sahifa)",
    getValue: (text) =>
      extract(
        text,
        /(https:\/\/ykem\.sanepid\.uz\/document\/user\/incomings2\/4)/
      ),
  },
  {
    label: "Hujjat havolasi (3-sahifa)",
    getValue: (text) =>
      extract(
        text,
        /(https:\/\/ykem\.sanepid\.uz\/document\/user\/incomings3\/4)/
      ),
  },
  {
    label: "Hujjat havolasi (4-sahifa)",
    getValue: (text) =>
      extract(
        text,
        /(https:\/\/ykem\.sanepid\.uz\/document\/user\/incomings4\/4)/
      ),
  },
];

/**
 * Asosiy extractor: text -> {label, value}[]
 */
function extractLabelValues(text) {
  const items = [];

  for (const field of FIELD_DEFS) {
    const value = field.getValue(text);
    items.push({
      label: field.label,
      value,
    });
  }

  return items;
}

class Type1PDFParser {
  static async parse(pdfPath) {
    try {
      let dataBuffer;
      if (Buffer.isBuffer(pdfPath)) {
        dataBuffer = pdfPath;
      } else {
        dataBuffer = await fs.readFile(pdfPath);
      }

      const data = await pdf(dataBuffer);
      const text = data.text || "";

      const result = {
        raw: text,
        parsed: extractLabelValues(text),
        metadata: {
          numPages: data.numpages,
          info: data.info,
        },
      };

      return result;
    } catch (error) {
      throw new Error(`Type1 PDF parsing error: ${error.message}`);
    }
  }

  static parseSync(text) {
    return extractLabelValues(text);
  }
}

module.exports = Type1PDFParser;
