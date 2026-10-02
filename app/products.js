const products = [
  // 🛒 راشن / کریانہ
  { id: 1, name: "چینی", price: 180, unit: "kg" },
  { id: 2, name: "آٹا", price: 150, unit: "kg" },
  { id: 3, name: "چاول باسمتی", price: 320, unit: "kg" },
  { id: 4, name: "چاول سادہ", price: 260, unit: "kg" },
  { id: 5, name: "دال مسور", price: 300, unit: "kg" },
  { id: 6, name: "دال ماش", price: 420, unit: "kg" },
  { id: 7, name: "دال چنا", price: 280, unit: "kg" },
  { id: 8, name: "دال مونگ", price: 320, unit: "kg" },
  { id: 9, name: "کالا چنا", price: 300, unit: "kg" },
  { id: 10, name: "سفید چنا", price: 340, unit: "kg" },
  { id: 11, name: "بیسن", price: 280, unit: "kg" },
  { id: 12, name: "سوجی", price: 180, unit: "kg" },
  { id: 13, name: "میدہ", price: 170, unit: "kg" },
  { id: 14, name: "کارن فلور", price: 220, unit: "kg" },
  { id: 15, name: "نمک", price: 60, unit: "kg" },
  { id: 16, name: "لال مرچ", price: 450, unit: "kg" },
  { id: 17, name: "ہلدی", price: 400, unit: "kg" },
  { id: 18, name: "دھنیا پاؤڈر", price: 350, unit: "kg" },
  { id: 19, name: "گرم مصالحہ", price: 900, unit: "kg" },
  { id: 20, name: "کالی مرچ", price: 1600, unit: "kg" },

  // 🫙 تیل / گھی
  { id: 21, name: "گھی", price: 550, unit: "kg" },
  { id: 22, name: "کوکنگ آئل", price: 600, unit: "liter" },
  { id: 23, name: "سرسوں کا تیل", price: 650, unit: "liter" },
  { id: 24, name: "زیتون کا تیل", price: 1800, unit: "liter" },

  // 🥛 دودھ / ڈیری
  { id: 25, name: "دودھ", price: 220, unit: "liter" },
  { id: 26, name: "دہی", price: 240, unit: "kg" },
  { id: 27, name: "مکھن", price: 850, unit: "pack" },
  { id: 28, name: "پنیر", price: 900, unit: "kg" },

  // ☕ چائے / ناشتے
  { id: 29, name: "چائے", price: 850, unit: "pack" },
  { id: 30, name: "گرین ٹی", price: 650, unit: "pack" },
  { id: 31, name: "کافی", price: 900, unit: "pack" },
  { id: 32, name: "دودھ پاؤڈر", price: 750, unit: "pack" },
  { id: 33, name: "شہد", price: 900, unit: "pack" },
  { id: 34, name: "جام", price: 450, unit: "pack" },
  { id: 35, name: "کارن فلیکس", price: 700, unit: "pack" },

  // 🍪 بسکٹ / سنیکس
  { id: 36, name: "بسکٹ", price: 50, unit: "pack" },
  { id: 37, name: "چاکلیٹ بسکٹ", price: 100, unit: "pack" },
  { id: 38, name: "کریم بسکٹ", price: 80, unit: "pack" },
  { id: 39, name: "نمکو", price: 100, unit: "pack" },
  { id: 40, name: "چپس", price: 80, unit: "pack" },
  { id: 41, name: "پاپڑ", price: 100, unit: "pack" },
  { id: 42, name: "ٹافی", price: 100, unit: "pack" },
  { id: 43, name: "چیونگم", price: 50, unit: "pack" },
  { id: 44, name: "چاکلیٹ", price: 100, unit: "piece" },

  // 🧼 صابن / صفائی
  { id: 45, name: "صابن", price: 100, unit: "piece" },
  { id: 46, name: "غسل کا صابن", price: 120, unit: "piece" },
  { id: 47, name: "ہینڈ واش", price: 250, unit: "pack" },
  { id: 48, name: "شیمپو", price: 350, unit: "pack" },
  { id: 49, name: "ٹوتھ پیسٹ", price: 250, unit: "pack" },
  { id: 50, name: "ٹوتھ برش", price: 120, unit: "piece" },
  { id: 51, name: "کپڑے دھونے کا صابن", price: 100, unit: "piece" },
  { id: 52, name: "سرف", price: 300, unit: "pack" },
  { id: 53, name: "ڈش واش", price: 250, unit: "pack" },
  { id: 54, name: "بلیچ", price: 200, unit: "pack" },
  { id: 55, name: "فینائل", price: 250, unit: "pack" },

  // 🧴 پرسنل کیئر
  { id: 56, name: "کریم", price: 250, unit: "pack" },
  { id: 57, name: "لوشن", price: 400, unit: "pack" },
  { id: 58, name: "ہیئر آئل", price: 300, unit: "pack" },
  { id: 59, name: "کنگھی", price: 80, unit: "piece" },
  { id: 60, name: "شیونگ کریم", price: 300, unit: "pack" },
  { id: 61, name: "بلیڈ", price: 150, unit: "pack" },
  { id: 62, name: "ٹشو", price: 180, unit: "pack" },
  { id: 63, name: "رومال", price: 100, unit: "piece" },

  // 🥤 مشروبات
  { id: 64, name: "کولڈ ڈرنک", price: 120, unit: "piece" },
  { id: 65, name: "جوس", price: 150, unit: "pack" },
  { id: 66, name: "منرل واٹر", price: 100, unit: "piece" },
  { id: 67, name: "شربت", price: 500, unit: "pack" },
  { id: 68, name: "انرجی ڈرنک", price: 250, unit: "piece" },

  // 🍝 نوڈلز / پیک شدہ کھانے
  { id: 69, name: "نوڈلز", price: 100, unit: "pack" },
  { id: 70, name: "میکرونی", price: 180, unit: "pack" },
  { id: 71, name: "اسپگھیٹی", price: 220, unit: "pack" },
  { id: 72, name: "ٹماٹو کیچپ", price: 350, unit: "pack" },
  { id: 73, name: "چلی سوس", price: 300, unit: "pack" },
  { id: 74, name: "سویا سوس", price: 300, unit: "pack" },

  // 🥫 دیگر کریانہ
  { id: 75, name: "سرکہ", price: 180, unit: "pack" },
  { id: 76, name: "کھجور", price: 600, unit: "kg" },
  { id: 77, name: "کشمش", price: 1000, unit: "kg" },
  { id: 78, name: "بادام", price: 2200, unit: "kg" },
  { id: 79, name: "مونگ پھلی", price: 500, unit: "kg" },
  { id: 80, name: "ناریل", price: 700, unit: "kg" },

  // 🧹 گھر کا سامان
  { id: 81, name: "ماچس", price: 30, unit: "pack" },
  { id: 82, name: "موم بتی", price: 100, unit: "pack" },
  { id: 83, name: "ایلومینیم فوائل", price: 300, unit: "pack" },
  { id: 84, name: "کلنگ فلم", price: 250, unit: "pack" },
  { id: 85, name: "کچرے کے تھیلے", price: 250, unit: "pack" },
  { id: 86, name: "اسفنج", price: 80, unit: "piece" },
  { id: 87, name: "جھاڑو", price: 250, unit: "piece" },
  { id: 88, name: "پوچا", price: 300, unit: "piece" },

  // 📚 اسٹیشنری
  { id: 89, name: "بال پوائنٹ", price: 30, unit: "piece" },
  { id: 90, name: "پنسل", price: 20, unit: "piece" },
  { id: 91, name: "ربڑ", price: 20, unit: "piece" },
  { id: 92, name: "شارپنر", price: 30, unit: "piece" },
  { id: 93, name: "کاپی", price: 150, unit: "piece" },
  { id: 94, name: "رجسٹر", price: 300, unit: "piece" },
  { id: 95, name: "مارکر", price: 80, unit: "piece" },

  // 👶 بچوں کا سامان
  { id: 96, name: "بے بی صابن", price: 180, unit: "piece" },
  { id: 97, name: "بے بی شیمپو", price: 400, unit: "pack" },
  { id: 98, name: "بے بی لوشن", price: 450, unit: "pack" },
  { id: 99, name: "بے بی پاؤڈر", price: 350, unit: "pack" },

  // 🔋 دیگر ضروری سامان
  { id: 100, name: "بیٹری", price: 100, unit: "pack" },
  { id: 101, name: "ایل ای ڈی بلب", price: 350, unit: "piece" },
  { id: 102, name: "سیل", price: 80, unit: "piece" },
  { id: 103, name: "ربڑ بینڈ", price: 50, unit: "pack" },
  { id: 104, name: "پلاسٹک کپ", price: 150, unit: "pack" },
  { id: 105, name: "پلاسٹک پلیٹ", price: 200, unit: "pack" },
];

export default products;