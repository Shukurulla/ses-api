// type2-pdf-parser.js
const pdf = require("pdf-parse");
const fs = require("fs").promises;

/**
 * Yordamchi funksiyalar
 */
function clean(str = "") {
  let s = String(str).replace(/\s+/g, " ").trim();

  // Harf va raqam orasiga bo'sh joy qo'yish: Ko'cha23mkr -> Ko'cha 23mkr, Uy1 -> Uy 1
  s = s.replace(/([A-Za-zА-Яа-яЁёʻ’ʼ`'])([0-9])/g, "$1 $2");
  s = s.replace(/([0-9])([A-Za-zА-Яа-яЁё])/g, "$1 $2");

  // kichik harf + katta harf orasiga bo'sh joy: ViloyatiQoraqalpog'iston -> Viloyati Qoraqalpog'iston
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
 * Kontaktlar jadvalini massivga aylantirish
 */
function parseContacts(rawText) {
  const start = "Muloqatda bo‘lganlarni nazorat olib borish";
  const end = "Kasallik o‘chog‘ini sog‘lomlashtirish rejasi";
  const sIdx = rawText.indexOf(start);
  const eIdx = rawText.indexOf(end);
  if (sIdx === -1 || eIdx === -1) return [];

  const block = rawText.substring(sIdx, eIdx);
  const line = clean(block);

  const re =
    /(\d+)\s+([^0-9]+?)\s+(\d{2}-\d{2}-\d{4})\s+([^0-9]+?)\s+(\d{2}-\d{2}-\d{4})\s+([^\s]+)/g;

  const contacts = [];
  let m;
  while ((m = re.exec(line)) !== null) {
    const t_r = clean(m[1]);
    const fio = clean(m[2]);
    const tugilgan_sana = clean(m[3]);
    let qar_ish = clean(m[4]);
    const xab_sana = clean(m[5]);
    const holat = clean(m[6]);

    let qarindoshlik_darajasi = "";
    let ish_oqish_joyi = "";

    if (qar_ish.includes("(") && qar_ish.includes(")")) {
      const i1 = qar_ish.indexOf("(");
      const i2 = qar_ish.indexOf(")", i1);
      if (i2 !== -1) {
        qarindoshlik_darajasi = clean(qar_ish.substring(0, i2 + 1));
        ish_oqish_joyi = clean(qar_ish.substring(i2 + 1));
      } else {
        ish_oqish_joyi = qar_ish;
      }
    } else {
      ish_oqish_joyi = qar_ish;
    }

    ish_oqish_joyi = ish_oqish_joyi.replace(/\sз\b/, "").trim();

    contacts.push({
      t_r,
      fio,
      tugilgan_sana,
      qarindoshlik_darajasi,
      ish_oqish_joyi,
      xabarnoma_yoki_tashxis_sanasi: xab_sana,
      muloqatdagilar_holati: holat,
    });
  }

  return contacts;
}

/**
 * Fieldlar
 */
const FIELD_DEFS = [
  {
    label: "№",
    getValue: (text) => extract(text, /(?:№|No)\s+(\d+)/),
  },
  {
    label: "Familiyasi, ismi, otasining ismi",
    getValue: (text) =>
      extract(text, /Familiyasi, ismi, otasining ismi\s*([^\n]+)/),
  },
  {
    label: "Manzil (asosiy ro'yxatda turgan)",
    getValue: (text) => {
      const m = text.match(
        /Manzil \(asosiy ro'yxatda turgan\):\s*([^\n]+)\n([^\n]+)/
      );
      return m ? clean(m[1] + " " + m[2]) : "";
    },
  },
  {
    label: "Yashab turgan manzil",
    getValue: (text) => {
      const m = text.match(/Yashab turgan manzil:\s*([^\n]+)\n([^\n]+)/);
      return m ? clean(m[1] + " " + m[2]) : "";
    },
  },
  {
    label: "Tug'ilgan yili",
    getValue: (text) => extract(text, /Tug'ilgan yili\s*([0-9\-]+)/),
  },
  {
    label: "Kasbi",
    getValue: (text) => between(text, "Kasbi", "Ish joyi"),
  },
  {
    label: "Ish joyi",
    getValue: (text) => between(text, "Ish joyi", "Kasallangan sanasi"),
  },
  {
    label: "Kasallangan sanasi",
    getValue: (text) => extract(text, /Kasallangan sanasi\s*([0-9:\- ]+)/),
  },
  {
    label:
      "Silga qarshi dispanser ro‘yhatidan birlamchi o‘tkazilgan sana va dispanser nomi",
    getValue: (text) =>
      between(
        text,
        "Silga qarshi dispanser ro‘yxatidan birlamchi o‘tkazilgan sana va dispanser nomi",
        "Sanitariya-epidemiologiya xizmatida ro‘yxatdan o‘tish vaqtidagi tashxisi"
      ),
  },
  {
    label:
      "Sanitariya-epidemiologiya xizmatida ro‘yxatdan o‘tish vaqtidagi tashxis",
    getValue: (text) =>
      clean(
        extract(
          text,
          /Sanitariya-epidemiologiya xizmatida ro‘yxatdan o‘tish vaqtidagi tashxisi\s*([^\n]+)/
        ) +
          " " +
          extract(
            text,
            /Sanitariya-epidemiologiya xizmatida ro‘yxatdan o‘tish vaqtidagi tashxisi[^\n]*\n([^\n]+)/
          )
      ),
  },
  {
    label: "Mikrobakteriyalarni birinchi ajratib olingan sanasi va usuli",
    getValue: (text) =>
      between(
        text,
        "Mikrobakteriyalarni birinchi ajratib olingan sanasi va usuli",
        "Sanitariya-epidemiologiya xizmatida MKB ajratuvchi bemorni ro‘yxatdan o‘tkazilgan sana"
      ),
  },
  {
    label:
      "Sanitariya-epidemiologiya xizmatida MKB ajratuvchi bemorni ro‘yxatdan o‘tkazilgan sana",
    getValue: (text) =>
      between(
        text,
        "Sanitariya-epidemiologiya xizmatida MKB ajratuvchi bemorni ro‘yxatdan o‘tkazilgan sana",
        "Kim tomonidan ro‘yxatdan o‘tkazilgan"
      ),
  },
  {
    label: "Kim tomonidan ro‘yxatdan o‘tkazilgan",
    getValue: (text) =>
      between(
        text,
        "Kim tomonidan ro‘yxatdan o‘tkazilgan",
        "Kasalxonaga yotqizilgan sana"
      ),
  },
  {
    label: "Kasalxonaga yotqizilgan sana",
    getValue: (text) =>
      extract(text, /Kasalxonaga yotqizilgan sana\s*([0-9\-: ]+)/),
  },
  {
    label: "Bemor yotqizilgan shifoxona nomi",
    getValue: (text) =>
      between(
        text,
        "Bemor yotqizilgan shifoxona nomi",
        "Yakuniy dezinfeksiya sanasi"
      ),
  },
  {
    label: "Yakuniy dezinfeksiya sanasi",
    getValue: (text) =>
      extract(text, /Yakuniy dezinfeksiya sanasi\s*([0-9\-: ]+)/),
  },
  {
    label: "Bemorni uyda qoldirilganligini sababi",
    getValue: (text) =>
      between(
        text,
        "Bemorni uyda qoldirilganligini sababi",
        "Kasalxonadan chiqarilgan sana"
      ),
  },
  {
    label: "Kasalxonadan chiqarilgan sana",
    getValue: (text) =>
      extract(text, /Kasalxonadan chiqarilgan sana\s*([0-9\-: ]+)/),
  },
  {
    label: "Silga qarshi emlash",
    getValue: (text) => extract(text, /Silga qarshi emlash:\s*([^\n]+)/),
  },
  {
    label:
      "Sil kasalligini MBT aniqlanmagunga qadar bemorning oxirgi rentgen tekshiruvi o'tgan sanasi, joyi va natijasi",
    getValue: (text) =>
      between(
        text,
        "Sil kasalligini MBT aniqlanmagunga qadar bemorning oxirgi rentgen tekshiruvi o'tgan sanasi, joyi va natijasi",
        "Ilgari sil bilan kasallangangaligi"
      ),
  },
  {
    label:
      "Ilgari sil bilan kasallangangaligi, qayerda, qaysi yilda, tashxisi, ro'yxatga olish guruhi",
    getValue: (text) =>
      between(
        text,
        "Ilgari sil bilan kasallangangaligi, qayerda, qaysi yilda, tashxisi, ro'yxatga olish guruhi",
        "Silning yopiq shakllarini ochiq shaklga o‘tishi, qaysi guruh dispanser ro‘yxatidan turgan-"
      ),
  },
  {
    label:
      "Silning yopiq shakllarini ochiq shaklga o‘tishi, qaysi guruh dispanser ro‘yxatidan turgan",
    getValue: (text) =>
      between(
        text,
        "Silning yopiq shakllarini ochiq shaklga o‘tishi, qaysi guruh dispanser ro‘yxatidan turgan-",
        "1. Tashxis"
      ),
  },
  {
    label: "1. Tashxis",
    getValue: (text) => between(text, "1. Tashxis:", "2. Sil kasalligini MBT"),
  },
  {
    label:
      "2. Sil kasalligini MBT aniqlanmagunga qadar bemorni oxirgi 2-yil davomida dispanserda tekshiruvlardan o‘tkazilgan sanalar",
    getValue: (text) => {
      let v = between(
        text,
        "2. Sil kasalligini MBT aniqlanmagunga qadar bemorni oxirgi 2-yil davomida dispanserda tekshiruvlardan o‘tkazilgan",
        "3. Qaytalanishga qarshi davolanish sanalari va davomiyligi:"
      );
      // faqat "sanalar:" bo'lsa, bo'sh qilish
      if (/^sanalar:?$/i.test(v)) return "";
      return v;
    },
  },
  {
    label: "3. Qaytalanishga qarshi davolanish sanalari va davomiyligi",
    getValue: (text) =>
      between(
        text,
        "3. Qaytalanishga qarshi davolanish sanalari va davomiyligi:",
        "Ishdan chetlatilgan sana"
      ),
  },
  {
    label: "Ishdan chetlatilgan sana",
    getValue: (text) => extract(text, /Ishdan chetlatilgan sana:\s*([^\n]+)/),
  },
  {
    label:
      "Dispanser tomonidan bemorning ish joyiga bemor to‘g‘risidagi ma’lumotlar berilgan sana",
    getValue: (text) =>
      between(
        text,
        "Dispanser tomonidan bemorning ish joyiga bemor to‘g‘risidagi ma’lumotlar berilgan sana:",
        "Kim qabul qildi"
      ),
  },
  {
    label: "Kim qabul qildi",
    getValue: (text) => {
      const v = between(
        text,
        "Kim qabul qildi-",
        "Bemor yashash joyiga (poliklinika)"
      );
      // Agar hech narsa yo'q bo'lsa, ideal bo'yicha "-"
      return v ? v : "-";
    },
  },
  {
    label: "Bemor yashash joyiga (poliklinika) ma’lumotlar berilgan sana",
    getValue: (text) =>
      extract(
        text,
        /Bemor yashash joyiga \(poliklinika\) ma’lumotlar berilgan sana:\s*([0-9\-: ]+)/
      ),
  },
  {
    label: "Ovqatlanish (muntazam, uyda, umumiy ovqatlanish joyida)",
    getValue: (text) =>
      between(
        text,
        "Ovqatlanish (muntazam, uyda, umumiy ovqatlanish joyida)",
        "Ish joyi sharoitlari:"
      ),
  },
  {
    label: "Ish joyi sharoitlari",
    getValue: (text) => extract(text, /Ish joyi sharoitlari:\s*([^\n]+)/),
  },
  {
    label: "Oila budjeti",
    getValue: (text) => extract(text, /Oila budjeti:\s*([^\n]+)/),
  },
  {
    label: "Zararli odatlari",
    getValue: (text) => extract(text, /Zararli odatlari:\s*([^\n]+)/),
  },
  {
    label: "Ehtimoliy yuqtirish manbai",
    getValue: (text) =>
      between(
        text,
        "EHTIMOLIY  YUQTIRISH MANBAI",
        "Sil bilan kasallangan bemor bilan aloqa qilish"
      ),
  },
  {
    label:
      "Sil bilan kasallangan bemor bilan aloqa qilish (oilada, ijarada, ishda)",
    getValue: (text) =>
      between(
        text,
        "Sil bilan kasallangan bemor bilan aloqa qilish (oilada, ijarada, ishda):",
        "Manbaning familiyasi va ismi:"
      ),
  },
  {
    label: "Manbaning familiyasi va ismi",
    getValue: (text) =>
      extract(text, /Manbaning familiyasi va ismi:\s*([^\n]+)/),
  },
  {
    label: "Bemor bilan muloqat vaqti va davomiyligi",
    getValue: (text) =>
      extract(
        text,
        /Bemor bilan muloqat vaqti va davomiyligi:\s*([0-9\.,: ]+document\.pdf)/
      ),
  },
  {
    label: "Hujjat havolasi (1-sahifa)",
    getValue: (text) =>
      extract(
        text,
        /(https:\/\/ykem\.sanepid\.uz\/document\/user\/incomings1\/2)/
      ),
  },

  // 2-sahifa
  {
    label:
      "Uy-joy turi (Alohida xovli joy, ko'p qavatli uyda xonadon, kommunal kvartira, yotoqxona)",
    getValue: (text) => extract(text, /Uy-joy turi .*:\s*([^\n]+)/),
  },
  {
    label: "Xonalar soni",
    getValue: (text) => extract(text, /Xonalar soni\s*(\d+)/),
  },
  {
    label: "Qavatlar soni",
    getValue: (text) => extract(text, /Qavatlar soni\s*(\d+)/),
  },
  {
    label: "Lift",
    getValue: (text) => extract(text, /Lift\s*([^\n]+)/),
  },
  {
    label: "Bemor bilan aloqada bo‘lganlar jami kishilar soni",
    getValue: (text) =>
      extract(
        text,
        /Bemor bilan aloqada bo‘lganlar jami kishilar soni\s*(\d+)/
      ),
  },
  {
    label: "Bemor bilan aloqada bo‘lgan jami oila a’zolari soni",
    getValue: (text) =>
      extract(
        text,
        /bemor bilan aloqada bo‘lgan jami oila a’zolari soni\s*(\d+)/
      ),
  },
  {
    label: "Kattalar soni",
    getValue: (text) => extract(text, /Kattalar soni\s*(\d+)/),
  },
  {
    label: "O‘smirlar soni",
    getValue: (text) => extract(text, /o‘smirlar soni\s*(\d+)/),
  },
  {
    label: "14 yoshgacha bo‘lgan bolalar soni",
    getValue: (text) =>
      extract(text, /14 yoshgacha bo‘lgan bolalar soni\s*(\d+)/),
  },
  {
    label: "Homilador ayollar soni",
    getValue: (text) => extract(text, /Homilador ayollar soni\s*(\d+)/),
  },
  {
    label:
      "Bolalar muassasasi, oziq-ovqat va shunga o‘xshash sohalarda ishchilar soni",
    getValue: (text) =>
      extract(
        text,
        /Bolalar muassasasi, oziq-ovqat va shunga o‘xshash sohalarda ishchilar soni\s*(\d+)/
      ),
  },
  {
    label: "Bemorning oilasi egallagan xonalar soni",
    getValue: (text) =>
      extract(text, /Bemorning oilasi egallagan xonalar soni\s*(\d+)/),
  },
  {
    label: "Har bir xona maydoni (kv.m)",
    getValue: (text) => extract(text, /har bir xona maydoni\(kv\.m\)\s*(\d+)/i),
  },
  {
    label: "Umumiy maydon (kv.m)",
    getValue: (text) => extract(text, /umumiy maydon \(kv\.m\)\s*(\d+)/i),
  },
  {
    label: "Bemor alohida xonani egallaydi (kv.m)",
    getValue: (text) => extract(text, /xonani egallaydi \(kv\.m\)\s*(\d+)/i),
  },
  {
    label: "Xonada bemor bilan birga yashaydigan kishilar soni",
    getValue: (text) =>
      extract(
        text,
        /Xonada bemor bilan birga yashaydigan kishilar soni\s*(\d+)/
      ),
  },
  {
    label: "Shu jumladan bolalar soni",
    getValue: (text) => extract(text, /shu jumladan bolalar soni\s*(\d+)/),
  },
  {
    label: "Kvartirani, bemor xonasini sanitariya-gigiyenik holatini baholash",
    getValue: (text) =>
      extract(
        text,
        /Kvartirani, bemor xonasini sanitariya-gigiyenik holatini baholash:\s*([^\n]+)/
      ),
  },
  {
    label: "Isitish",
    getValue: (text) => extract(text, /Isitish:\s*([^\n]+?)\s+Kanalizatsiya/),
  },
  {
    label: "Kanalizatsiya",
    getValue: (text) =>
      extract(text, /Kanalizatsiya:\s*([^\n]+?)\s+Ventilyatsiya/),
  },
  {
    label: "Ventilyatsiya",
    getValue: (text) => extract(text, /Ventilyatsiya\s*([^\n]+)/),
  },
  {
    label: "Xonani ta’mirlash kerak",
    getValue: (text) => extract(text, /Xonani ta’mirlash kerak:\s*([^\n]+)/),
  },
  {
    label: "Yashash uchun yaroqliligi",
    getValue: (text) => extract(text, /Yashash uchun yaroqliligi:\s*([^\n]+)/),
  },
  {
    label: "Qaysi yilda yashash sharoiti yaxshilandi",
    getValue: (text) =>
      between(
        text,
        "Qaysi yilda yashash sharoiti yaxshilandi",
        "Eski manzilidagi uy-joy va yashash sharoitlarning xususiyatlari"
      ),
  },
  {
    label: "Eski manzilidagi uy-joy va yashash sharoitlarining xususiyatlari",
    getValue: (text) =>
      between(
        text,
        "Eski manzilidagi uy-joy va yashash sharoitlarning xususiyatlari",
        "SANITARIYA GIGIYENA KO‘NIKMALARI"
      ),
  },
  {
    label: "Sanitariya gigiyena ko‘nikmalari bo‘limi",
    getValue: () => "",
  },
  {
    // ideal bo'yicha bu maydonni bo'sh qoldiramiz (faqat savol matni)
    label: "Bemor yo‘talga qarshi ehtiyot choralarini qo‘llaydimi",
    getValue: () => "",
  },
  {
    label: "Cho‘ntak tupukdoni bormi",
    getValue: (text) =>
      extract(
        text,
        /Cho‘ntak tupukdoni bormi: ha\/yo'q \(sonini ko'rsating\)\s*([A-Za-zА-Яа-я0-9 ]+)\s+\d+/
      ),
  },
  {
    label: "Cho‘ntak tupukdoni soni",
    getValue: (text) =>
      extract(
        text,
        /Cho‘ntak tupukdoni bormi: ha\/yo'q \(sonini ko'rsating\)\s*[A-Za-zА-Яа-я0-9 ]+\s+(\d+)/
      ),
  },
  {
    label: "Cho‘ntak tupukdonidan foydalanadi (ishda)",
    getValue: (text) => extract(text, /Undan foydalanadi: Ishda -\s*([^\s]+)/),
  },
  {
    label: "Cho‘ntak tupukdonidan foydalanadi (uyda)",
    getValue: (text) => extract(text, /Uyda -\s*([^\s]+)/),
  },
  {
    label: "Cho‘ntak tupukdonidan foydalanadi (jamoat joylarida)",
    getValue: (text) => extract(text, /Jamoat joylarida -\s*([^\s]+)/),
  },
  {
    label: "Balg‘am va tupuriklarni zararsizlantirish usuli",
    getValue: (text) =>
      extract(
        text,
        /Balg‘am va tupuriklarni zararsizlantirish usuli:\s*([^\n]+)/
      ),
  },
  {
    label:
      "Tupurish va balg‘amlarni kim dezinfeksiya qiladi (familiyasi, qarindoshlik munosabatlari)",
    getValue: (text) =>
      between(
        text,
        "Tupurish va balg‘amlarni kim dezinfeksiya qiladi (familiyasi, qarindoshlik munosabatlari)",
        "Bemor dezinfeksiya vositalarini olishi"
      ),
  },
  {
    label: "Bemor dezinfeksiya vositalarini olishi",
    getValue: (text) =>
      extract(text, /Bemor dezinfeksiya vositalarini olishi:\s*([^\n]+)/),
  },
  {
    label: "Dezinfeksiyalovchi vosita kim tomonidan beriladi",
    getValue: (text) =>
      between(
        text,
        "Dezinfeksiyalovchi vosita kim tomonidan beriladi:",
        "Dezinfeksiyalovchi vosita miqdori"
      ),
  },
  {
    label: "Dezinfeksiyalovchi vosita miqdori (oyiga)",
    getValue: (text) =>
      extract(text, /Dezinfeksiyalovchi vosita miqdori \(oyiga\):\s*([^\n]+)/),
  },
  {
    label: "Hududiy dispanser hamshirasi tashrif chastotasi",
    getValue: (text) =>
      extract(text, /Hududiy dispanser hamshirasi\s*(bemor[^\n]+)/),
  },
  {
    label: "Hududiy dispanser ftiziatori tashrif chastotasi",
    getValue: (text) =>
      extract(text, /Hududiy dispanser ftiziatori\s*(bemor[^\n]+)/),
  },
  {
    label: "Muloqatda bo‘lganlarni nazorat olib borish",
    getValue: () => "",
  },
  {
    label: "Kasallik o‘chog‘ini sog‘lomlashtirish rejasi",
    getValue: (text) =>
      between(
        text,
        "Kasallik o‘chog‘ini sog‘lomlashtirish rejasi",
        "Kasallik o‘chog‘ini sog‘lomlashtirish rejasiBoshlangan muddatTugatilgan muddat"
      ),
  },
  {
    label:
      "Kasallik o‘chog‘ini sog‘lomlashtirish rejasi (boshlangan va tugatilgan muddat)",
    getValue: (text) =>
      between(
        text,
        "Kasallik o‘chog‘ini sog‘lomlashtirish rejasiBoshlangan muddatTugatilgan muddat",
        "Yakuniy va joriy dizinfeksiya"
      ),
  },
  {
    label: "Yakuniy va joriy dizinfeksiya",
    getValue: (text) =>
      extract(text, /Yakuniy va joriy dizinfeksiya\s*([0-9\- ]+\s+[0-9\- ]+)/),
  },
  {
    label: "Epidemiolog vrach",
    getValue: (text) =>
      between(
        text,
        "Epidemiolog vrach",
        "https://ykem.sanepid.uz/document/user/incomings2/2"
      ),
  },
  {
    label: "Hujjat havolasi (2-sahifa)",
    getValue: (text) =>
      extract(
        text,
        /(https:\/\/ykem\.sanepid\.uz\/document\/user\/incomings2\/2)/
      ),
  },
];

/**
 * Asosiy extractor
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

  const contacts = parseContacts(text);
  items.push({
    label: "Kontaktlar",
    value: contacts,
  });

  return items;
}

class Type2PDFParser {
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

      const parsed = extractLabelValues(text);

      return {
        raw: text,
        parsed,
        metadata: {
          numPages: data.numpages,
          info: data.info,
        },
      };
    } catch (error) {
      throw new Error(`Type2 PDF parsing error: ${error.message}`);
    }
  }

  static parseSync(text) {
    return extractLabelValues(text);
  }
}

module.exports = Type2PDFParser;
