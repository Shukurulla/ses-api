const pdf = require('pdf-parse');
const fs = require('fs').promises;

/**
 * Type 3 PDF Parser: Yuqumli Kasalliklar Kartasi (Qisqacha)
 * Bu parser 3.pdf formatidagi PDF fayllarni parse qiladi
 */

/** --- Universal Helper Functions --- */
function clean(str = "") {
  return String(str).replace(/\s+/g, " ").trim();
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

/** --- 17–21 Sana blokini avtomatik topuvchi funksiyalar --- */
function extractTimeline(text) {
  const block = between(text, "17. Kasallangan", "22. Yotqizilgan kasalxona");

  const dates = block.match(/\d{2}-\d{2}-\d{4}(?:\s+\d{2}:\d{2})?/g) || [];

  return {
    kasallangan_sana: dates[0] || "",
    murojaat_vaqti: dates[1] || "",
    shoshilinch_xabarnoma: dates[2] || "",
    yotqizilgan_sana: dates[3] || "",
    yakunlovchi_sana: dates[4] || "",
  };
}

/** --- 3.pdf field definitions --- */
const FIELD_DEFS = [
  { label: "№", getValue: (txt) => extract(txt, /№\s+(\d+)/) },

  {
    label: "Birlamchi tashxis",
    getValue: (txt) => extract(txt, /1\. Birlamchi tashxis\s+([^\n]+)/),
  },

  {
    label: "Kasallik qo'zg'atuvchisi",
    getValue: (txt) =>
      between(txt, "2. Kasallik qo'zg'atuvchisining turi, xili", "3. Bemor"),
  },

  {
    label: "Bemor (mahalliy / kelgan)",
    getValue: (txt) => extract(txt, /3\. Bemor:\s+([A-Za-zА-Яа-я '' ]+)/),
  },

  {
    label: "F.I.SH",
    getValue: (txt) => extract(txt, /4\. F\.I\.SH\s+(.+)\n5\./),
  },

  {
    label: "Jinsi",
    getValue: (txt) => extract(txt, /5\. Jinsi\s+([A-Za-zА-Яа-я]+)/),
  },

  {
    label: "Tug'ilgan sanasi",
    getValue: (txt) => extract(txt, /6\. Tug'ilgan sanasi\s+([0-9\-]+ yil)/),
  },

  {
    label: "Doimiy yashash joyi",
    getValue: (txt) => {
      const m = txt.match(/7\. Doimiy yashash joyi:\s*([^\n]+)\n([^\n]+)/);
      return m ? clean(m[1] + " " + m[2]) : "";
    },
  },

  {
    label: "Hozirgi yashash joyi",
    getValue: (txt) => {
      const m = txt.match(/8\. Hozirgi yashash joyi:\s*([^\n]+)\n([^\n]+)/);
      return m ? clean(m[1] + " " + m[2]) : "";
    },
  },

  {
    label: "Ishlash / O'qish joyi",
    getValue: (txt) =>
      extract(txt, /9\. Ishlash, o'qish joyi, bog'cha\s*([^\n]*)/),
  },

  {
    label: "Turar joyi bo'yicha davolash muassasasi",
    getValue: (txt) =>
      extract(txt, /11\. Turar joyi bo'yicha davolash muassasasi:\s*([^\n]+)/),
  },

  {
    label: "Bemor haqida habar olingan sana",
    getValue: (txt) =>
      extract(txt, /12\. Bemor haqida habar olinganligi.*?\s([0-9:\- ]+)/),
  },

  {
    label: "Kim tomonidan yuborilgan",
    getValue: (txt) =>
      extract(txt, /13\. Kim tomonidan yuborilgan.*?\s([^\n]+)/),
  },

  {
    label: "Kasallikning birinchi belgilari",
    getValue: (txt) =>
      extract(
        txt,
        /14\. Kasallikning birinchi kunlaridagi asosiy belgilari\s+([^\n]+)/
      ),
  },

  {
    label: "Bemor aniqlandi",
    getValue: (txt) => extract(txt, /15\. Bemor aniqlandi\s+([^\n]+)/),
  },

  {
    label: "Epidemiologik tekshiruv vaqti",
    getValue: (txt) =>
      extract(txt, /16\. Epidemiologik tekshiruv.*?\s([0-9:\- ]+)/),
  },

  {
    label: "Kuzatuv tamomlangan",
    getValue: (txt) => extract(txt, /Kuzatuv tamomlangan vaqt\s+([0-9:\- ]+)/),
  },

  /** Timeline values from 17–21 */
  {
    label: "Kasallangan sana",
    getValue: (t) => extractTimeline(t).kasallangan_sana,
  },
  {
    label: "Murojaat etgan vaqt",
    getValue: (t) => extractTimeline(t).murojaat_vaqti,
  },
  {
    label: "Shoshilinch xabarnoma sanasi",
    getValue: (t) => extractTimeline(t).shoshilinch_xabarnoma,
  },
  {
    label: "Kasalxonaga yotqizilgan sana",
    getValue: (t) => extractTimeline(t).yotqizilgan_sana,
  },
  {
    label: "Yakunlovchi tashxis sanasi",
    getValue: (t) => extractTimeline(t).yakunlovchi_sana,
  },

  {
    label: "Yotqizilgan kasalxona va transport",
    getValue: (txt) => extract(txt, /22\. Yotqizilgan kasalxona.*?\s([^\n]+)/),
  },

  {
    label: "Uyida qoldirilish sababi",
    getValue: (txt) => extract(txt, /23\. Uyida qoldirilish.*?\s([^\n]+)/),
  },

  {
    label: "Laboratoriya tekshiruvi",
    getValue: (txt) => extract(txt, /25\. Laboratoriya tekshiruvi:\s*([^\n]+)/),
  },

  {
    label: "Oxirgi emlash haqida ma'lumot",
    getValue: (txt) => between(txt, "26. Oxirgi emlash", "II. KASALLIKNI"),
  },

  {
    label: "Taxminiy yuqqan muddati",
    getValue: (txt) =>
      extract(
        txt,
        /27\. Taxminiy yuqqan muddati:\s*([0-9\- ]+dan [0-9\- ]+gacha)/
      ),
  },

  {
    label: "Noqulay shart–sharoitlar",
    getValue: (txt) =>
      between(txt, "28. Kasallik yuqish", "29. Kasallik manbai"),
  },

  {
    label: "Kasallik manbai bo'lishi mumkin shaxslar",
    getValue: (txt) => between(txt, "29. Kasallik manbai", "30. Bu kasallikni"),
  },

  {
    label: "Suv va oziq–ovqat ma'lumotlari",
    getValue: (txt) =>
      between(txt, "30. Bu kasallikni kelib chiqishida", "A. YASHASH JOYI"),
  },

  {
    label: "Yashash sharoiti",
    getValue: (txt) => extract(txt, /31\. Yashash sharoiti\s+([^\n]+)/),
  },

  {
    label: "Zichligi – Kishilar",
    getValue: (txt) => extract(txt, /Kishilar soni\s+(\d+)/),
  },
  {
    label: "Zichligi – Xonalar",
    getValue: (txt) => extract(txt, /Xonalar soni\s+(\d+)/),
  },
  {
    label: "Zichligi – Maydon",
    getValue: (txt) => extract(txt, /Maydoni\s+(\d+)/),
  },

  {
    label: "Suv ta'minoti",
    getValue: (txt) => extract(txt, /33\. Suv bilan ta'minlanishi\s+([^\n]+)/),
  },

  {
    label: "Suyuq chiqindilar",
    getValue: (txt) => extract(txt, /34\. Suyuq chiqindilardan.*?\s([^\n]+)/),
  },

  {
    label: "Qattiq chiqindilar",
    getValue: (txt) => extract(txt, /35\. Qattiq chiqindilarni.*?\s([^\n]+)/),
  },

  {
    label: "Sanitariya holati",
    getValue: (txt) =>
      extract(txt, /36\. Xonadonda sanitar xolatni saqlash:\s*([^\n]+)/),
  },

  {
    label: "Bitlash borligi",
    getValue: (txt) => extract(txt, /37\. Bitlash borligi\s+([^\n]+)/),
  },

  {
    label: "Boshqa hashoratlar",
    getValue: (txt) => extract(txt, /Boshqa hashoratlar\s+([^\n]+)/),
  },

  {
    label: "Kemiruvchilar",
    getValue: (txt) => extract(txt, /Kemiruvchilar\s+([^\n]+)/),
  },

  {
    label: "Kasallik sabab (A bo'lim)",
    getValue: (txt) =>
      between(txt, "38. Kasallikni kelib chiqishida", "B. ISH"),
  },

  {
    label: "Bemor bo'lgan ob'ektlar",
    getValue: (txt) =>
      between(txt, "39. Bemor bo'lgan ob'ektlar", "40. Sanitar"),
  },

  {
    label: "Sanitar–gigienik talablar",
    getValue: (txt) => between(txt, "40. Sanitar – gigienik", "41. Kasallikni"),
  },

  {
    label: "Kasallikni keltirgan omillar",
    getValue: (txt) =>
      extract(txt, /41\. Kasallikni keltirib chiqar gan omillar\s+([^\n]+)/),
  },

  {
    label: "Tashqi muhit laboratorik tekshiruv",
    getValue: (txt) =>
      between(txt, "42. Tashqi muhit materiallarini", "III. O'СHOQ"),
  },

  {
    label: "Muloqatda bo'lganlar kuzatuvi",
    getValue: (txt) =>
      between(txt, "43. Bemor bilan muloqatda bo'lganlar", "44. Mahsus"),
  },

  {
    label: "Mahsus profilaktika tadbirlari",
    getValue: (txt) =>
      between(txt, "44. Mahsus profilaktik chora", "46. Kasallik o'chog'ida"),
  },

  {
    label: "Kasallanish mexanizmini uzish choralar",
    getValue: (txt) =>
      between(txt, "46. Kasallik o'chog'ida", "47. Bemor yotqizilgan"),
  },

  {
    label: "Bemor yotqizilgan kasalxona nomi",
    getValue: (txt) =>
      extract(txt, /47\. Bemor yotqizilgan kasalxona nomi\s*([^\n]+)/),
  },

  {
    label: "Kasallik chaqiruvchisini yuqtirgan joy",
    getValue: (txt) =>
      extract(
        txt,
        /1\. Kasallik chaqiruvchisini yuqtirishga gumon qilingan joy\s*([^\n]+)/
      ),
  },

  {
    label: "Yuqtirilishi ehtimol qiligan joy",
    getValue: (txt) =>
      extract(
        txt,
        /2\. Kasallikni yuqtirilishi ehtimol qilingan joy\s*([^\n]+)/
      ),
  },

  {
    label: "Gumon qilingan kasallik manbai",
    getValue: (txt) =>
      between(
        txt,
        "3. Gumon qilingan kasallik manbai",
        "4. Kasallik chaqiruvchisini"
      ),
  },

  {
    label: "Ehtimoliy asosiy faktor",
    getValue: (txt) =>
      between(txt, "4. Kasallik chaqiruvchisini", "5. Kasallikni yuqtirishga"),
  },

  {
    label: "Kasallikni yuqtirish sabablari",
    getValue: (txt) =>
      between(txt, "5. Kasallikni yuqtirishga sabab", "6. O'chog'dagi"),
  },

  {
    label: "O'choqdagi kasallanish",
    getValue: (txt) => extract(txt, /A:\s*([A-Za-z]+)/),
  },

  {
    label: "Kartani topshirilgan vaqt",
    getValue: (txt) =>
      extract(txt, /Kartani medstatistikka topshirilgan vaqt\s*([0-9\-]+)/),
  },

  {
    label: "Epidemiolog vrach",
    getValue: (txt) => extract(txt, /Epidemiolog vrach\s+([^\n]+)/),
  },
];

/** --- Main extractor --- */
function extractLabelValues(text) {
  return FIELD_DEFS.map((f) => ({
    label: f.label,
    value: f.getValue(text),
  }));
}

class Type3PDFParser {
  /**
   * PDF faylni parse qilish
   * @param {string} pdfPath - PDF fayl yo'li yoki Buffer
   * @returns {Promise<Object>} - Parse qilingan ma'lumotlar
   */
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
        }
      };

      return result;
    } catch (error) {
      throw new Error(`Type3 PDF parsing error: ${error.message}`);
    }
  }

  /**
   * Sync variant - buffer uchun
   */
  static parseSync(text) {
    return extractLabelValues(text);
  }
}

module.exports = Type3PDFParser;
