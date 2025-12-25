import { groupedTranslations } from "@mongez/localization";

groupedTranslations("validation", {
  required: {
    en: "The :input field is required.",
    ar: ":input مطلوب.",
  },
  present: {
    en: "The :input field must be present.",
    ar: ":input يجب أن يكون موجود.",
  },
  equal: {
    en: "The :input must equal :value.",
    ar: ":input يجب أن يساوي :value.",
  },
  equalsField: {
    en: "The :input must match :field.",
    ar: ":input يجب أن يتطابق مع :field.",
  },
  notEqualsField: {
    en: "The :input must not match :field.",
    ar: ":input يجب ألا يتطابق مع :field.",
  },
  when: {
    en: "The :input validation failed.",
    ar: "فشل التحقق من :input.",
  },
  egyptianPhoneNumber: {
    en: "Make sure the :input is a valid Egyptian phone number.",
    ar: ":input يجب أن يكون رقم هاتف صالح.",
  },
  missing: {
    en: "The :input field can not be present.",
    ar: ":input لا يمكن أن يكون موجود.",
  },
  unique: {
    en: "The :input has already been taken.",
    ar: ":input مستخدم من قبل.",
  },
  uniqueExceptCurrentUser: {
    en: "The :input has already been taken.",
    ar: ":input مستخدم من قبل.",
  },
  uniqueExceptCurrentId: {
    en: "The :input has already been taken.",
    ar: ":input مستخدم من قبل.",
  },
  object: {
    en: ":input must be an object.",
    ar: ":input يجب أن يكون كائن.",
  },
  uploadable: {
    en: ":input must be a uploadable type, upload hash must be passed.",
    ar: ":input يجب أن يكون من نوع قابل للتحميل، يجب تمرير هاش التحميل.",
  },
  exists: {
    en: "The selected :input does not exist in our database records.",
    ar: ":input المحدد غير موجود في سجلات قاعدة البيانات الخاصة بنا.",
  },
  matches: {
    en: ":input must match :field.",
    ar: ":input يجب أن يتطابق مع :field.",
  },
  min: {
    en: ":input must be at least :min.",
    ar: ":input يجب أن يكون على الأقل :min.",
  },
  max: {
    en: ":input must be at most :max.",
    ar: ":input يجب أن يكون على الأكثر :max.",
  },
  greaterThan: {
    en: ":input must be greater than :value.",
    ar: ":input يجب أن يكون أكثر من :value.",
  },
  greaterThanOrEqual: {
    en: ":input must be greater than or equal to :value.",
    ar: ":input يجب أن يكون أكثر من أو يساوي :value.",
  },
  lessThan: {
    en: ":input must be less than :value.",
    ar: ":input يجب أن يكون أقل من :value.",
  },
  lessThanOrEqual: {
    en: ":input must be less than or equal to :value.",
    ar: ":input يجب أن يكون أقل من أو يساوي :value.",
  },
  betweenNumbers: {
    en: ":input must be between :min and :max.",
    ar: ":input يجب أن يكون بين :min و :max.",
  },
  positive: {
    en: ":input must be positive.",
    ar: ":input يجب أن يكون موجب.",
  },
  negative: {
    en: ":input must be negative.",
    ar: ":input يجب أن يكون سالب.",
  },
  odd: {
    en: ":input must be an odd number.",
    ar: ":input يجب أن يكون عدد فردي.",
  },
  even: {
    en: ":input must be an even number.",
    ar: ":input يجب أن يكون عدد زوجي.",
  },
  modulo: {
    en: ":input must be divisible by :modulo.",
    ar: ":input يجب أن يكون قابلاً للقسمة على :modulo.",
  },
  file: {
    en: ":input must be a file.",
    ar: ":input يجب أن يكون ملف.",
  },
  files: {
    en: ":input must be an array of files.",
    ar: ":input يجب أن يكون مجموعة من الملفات.",
  },
  maxFileSize: {
    en: ":input file size must not exceed :maxSize.",
    ar: "حجم ملف :input يجب ألا يتجاوز :maxSize.",
  },
  minFileSize: {
    en: ":input file size must be at least :minSize.",
    ar: "حجم ملف :input يجب أن يكون على الأقل :minSize.",
  },
  minWidth: {
    en: ":input image width must be at least :minWidth pixels.",
    ar: "عرض صورة :input يجب أن يكون على الأقل :minWidth بكسل.",
  },
  maxWidth: {
    en: ":input image width must be at most :maxWidth pixels.",
    ar: "عرض صورة :input يجب أن يكون على الأكثر :maxWidth بكسل.",
  },
  minHeight: {
    en: ":input image height must be at least :minHeight pixels.",
    ar: "ارتفاع صورة :input يجب أن يكون على الأقل :minHeight بكسل.",
  },
  maxHeight: {
    en: ":input image height must be at most :maxHeight pixels.",
    ar: "ارتفاع صورة :input يجب أن يكون على الأكثر :maxHeight بكسل.",
  },
  image: {
    en: ":input must be an image.",
    ar: ":input يجب أن يكون صورة.",
  },
  images: {
    en: ":input must be an array of images.",
    ar: ":input يجب أن يكون مجموعة من الصور.",
  },
  minLength: {
    en: ":input must be at least :minLength characters.",
    ar: ":input يجب أن يكون على الأقل :minLength حرف.",
  },
  maxLength: {
    en: ":input must be at most :maxLength characters.",
    ar: ":input يجب أن يكون على الأكثر :maxLength حرف.",
  },
  betweenLength: {
    en: ":input must be between :minLength and :maxLength characters.",
    ar: ":input يجب أن يكون بين :minLength و :maxLength حرف.",
  },
  words: {
    en: ":input must be exactly :words words.",
    ar: ":input يجب أن يكون بالضبط :words كلمة.",
  },
  minWords: {
    en: ":input must be at least :minWords words.",
    ar: ":input يجب أن يكون على الأقل :minWords كلمة.",
  },
  maxWords: {
    en: ":input must be at most :maxWords words.",
    ar: ":input يجب أن يكون على الأكثر :maxWords كلمة.",
  },
  email: {
    en: "The :input must be a valid email address.",
    ar: ":input يجب أن يكون بريد إلكتروني صالح.",
  },
  localized: {
    en: ":input must be a an array of objects, each object has localeCode and text properties.",
    ar: ":input يجب أن يكون مصفوفة من الكائنات، كل كائن يحتوي على خصائص localeCode و text.",
  },
  in: {
    en: ":input accepts only the following values: :options.",
    ar: ":input يقبل القيم التالية فقط: :options.",
  },
  allowedValues: {
    en: ":input accepts only the following values: :values.",
    ar: ":input يقبل القيم التالية فقط: :values.",
  },
  notAllowedValues: {
    en: ":input must not be one of the following values: :values.",
    ar: ":input يجب ألا يكون أحد القيم التالية: :values.",
  },
  string: {
    en: ":input must be a string.",
    ar: ":input يجب أن يكون سلسلة.",
  },
  number: {
    en: ":input must be a number.",
    ar: ":input يجب أن يكون رقم.",
  },
  integer: {
    en: ":input must be an integer.",
    ar: ":input يجب أن يكون عدد صحيح.",
  },
  float: {
    en: ":input must be a float.",
    ar: ":input يجب أن يكون عدد عائم.",
  },
  boolean: {
    en: ":input must be a boolean.",
    ar: ":input يجب أن يكون منطقي.",
  },
  pattern: {
    en: ":input must match the following pattern: :pattern.",
    ar: ":input يجب أن يتطابق مع النمط التالي: :pattern.",
  },
  array: {
    en: ":input must be an array.",
    ar: ":input يجب أن يكون مصفوفة.",
  },
  arrayOf: {
    en: ":input must be an array of :type.",
    ar: ":input يجب أن يكون مصفوفة من :type.",
  },
  tupleLengthMismatch: {
    en: "The :input must have exactly :expected items, but got :actual.",
    ar: ":input يجب أن يحتوي على :expected عناصر بالضبط، لكن تم استلام :actual.",
  },
  uniqueArray: {
    en: ":input array must contain unique values.",
    ar: ":input يجب أن يحتوي على قيم فريدة.",
  },
  sortedArray: {
    en: ":input array must be sorted.",
    ar: ":input يجب أن يكون مرتباً.",
  },
  url: {
    en: ":input must be a valid URL.",
    ar: ":input يجب أن يكون رابط صالح.",
  },
  length: {
    en: ":input must be :length characters.",
    ar: ":input يجب أن يكون :length حرف.",
  },
  scalar: {
    en: ":input must be a string, number or boolean",
    ar: ":input يجب أن يكون رقم أو نص أو قيمة منطقية",
  },
  stringify: {
    en: ":input must be number, string",
    ar: ":input يجب أن يكون رقم أو نص ",
  },
  unknownKeys: {
    en: "The :input contains unknown keys: :unknownKeys",
    ar: ":input يحتوي على حقول غير معروفة: :unknownKeys",
  },
  forbidden: {
    en: "The :input can not be present.",
    ar: ":input لا يمكن أن يكون موجود.",
  },
  forbiddenIf: {
    en: "The :input is forbidden when :field equals :value.",
    ar: "يُحظر إدخال :input عندما :field يساوي :value.",
  },
  forbiddenIfNot: {
    en: "The :input is forbidden when :field does not equal :value.",
    ar: "يُحظر إدخال :input عندما :field لا يساوي :value.",
  },
  forbiddenIfEmpty: {
    en: "The :input is forbidden when :field is empty.",
    ar: "يُحظر إدخال :input عندما :field فارغ.",
  },
  forbiddenIfNotEmpty: {
    en: "The :input is forbidden when :field is not empty.",
    ar: "يُحظر إدخال :input عندما :field غير فارغ.",
  },
  forbiddenIfIn: {
    en: "The :input is forbidden when :field is one of the specified values.",
    ar: "يُحظر إدخال :input عندما :field يكون أحد القيم المحددة.",
  },
  forbiddenIfNotIn: {
    en: "The :input is forbidden when :field is not one of the specified values.",
    ar: "يُحظر إدخال :input عندما :field ليس أحد القيم المحددة.",
  },
  enum: {
    en: ":input must be one of the following values: :enum, given value :value.",
    ar: ":input يجب أن يكون أحد القيم التالية: :enum, القيمة المعطاة :value.",
  },
  alpha: {
    en: ":input must contain only alphabetic characters.",
    ar: ":input يجب أن يحتوي على أحرف أبجدية فقط.",
  },
  alphaNumeric: {
    en: ":input must contain only alphabetic and numeric characters.",
    ar: ":input يجب أن يحتوي على أحرف أبجدية وأرقام فقط.",
  },
  numeric: {
    en: ":input must contain only numeric characters.",
    ar: ":input يجب أن يحتوي على أرقام فقط.",
  },
  withoutWhitespace: {
    en: ":input must not contain whitespace.",
    ar: ":input يجب ألا يحتوي على مسافات.",
  },
  startsWith: {
    en: ":input must start with :prefix.",
    ar: ":input يجب أن يبدأ بـ :prefix.",
  },
  endsWith: {
    en: ":input must end with :suffix.",
    ar: ":input يجب أن ينتهي بـ :suffix.",
  },
  contains: {
    en: ":input must contain :substring.",
    ar: ":input يجب أن يحتوي على :substring.",
  },
  notContains: {
    en: ":input must not contain :substring.",
    ar: ":input يجب ألا يحتوي على :substring.",
  },
  ip: {
    en: ":input must be a valid IP address.",
    ar: ":input يجب أن يكون عنوان IP صالح.",
  },
  ip4: {
    en: ":input must be a valid IPv4 address.",
    ar: ":input يجب أن يكون عنوان IPv4 صالح.",
  },
  ip6: {
    en: ":input must be a valid IPv6 address.",
    ar: ":input يجب أن يكون عنوان IPv6 صالح.",
  },
  creditCard: {
    en: ":input must be a valid credit card number.",
    ar: ":input يجب أن يكون رقم بطاقة ائتمان صالح.",
  },
  strongPassword: {
    en: ":input must be a strong password (at least 8 characters, uppercase, lowercase, number, and special character).",
    ar: ":input يجب أن يكون كلمة مرور قوية (8 أحرف على الأقل، أحرف كبيرة وصغيرة، رقم، ورمز خاص).",
  },
  color: {
    en: ":input must be a valid color.",
    ar: ":input يجب أن يكون لون صالح.",
  },
  hexColor: {
    en: ":input must be a valid hex color.",
    ar: ":input يجب أن يكون لون hex صالح.",
  },
  rgbColor: {
    en: ":input must be a valid RGB color.",
    ar: ":input يجب أن يكون لون RGB صالح.",
  },
  rgbaColor: {
    en: ":input must be a valid RGBA color.",
    ar: ":input يجب أن يكون لون RGBA صالح.",
  },
  hslColor: {
    en: ":input must be a valid HSL color.",
    ar: ":input يجب أن يكون لون HSL صالح.",
  },
  lightColor: {
    en: ":input must be a light color.",
    ar: ":input يجب أن يكون لون فاتح.",
  },
  darkColor: {
    en: ":input must be a dark color.",
    ar: ":input يجب أن يكون لون داكن.",
  },
  date: {
    en: ":input must be a valid date.",
    ar: ":input يجب أن يكون تاريخ صالح.",
  },
  minDate: {
    en: ":input must be at least :dateOrField.",
    ar: ":input يجب أن يكون على الأقل :dateOrField.",
  },
  maxDate: {
    en: ":input must be at most :dateOrField.",
    ar: ":input يجب أن يكون على الأكثر :dateOrField.",
  },
  beforeField: {
    en: ":input must be before :dateOrField.",
    ar: ":input يجب أن يكون قبل :dateOrField.",
  },
  afterField: {
    en: ":input must be after :dateOrField.",
    ar: ":input يجب أن يكون بعد :dateOrField.",
  },
  sameAsFieldDate: {
    en: ":input must be the same as :field.",
    ar: ":input يجب أن يكون نفس :field.",
  },
  betweenDates: {
    en: ":input must be between :startDate and :endDate.",
    ar: ":input يجب أن يكون بين :startDate و :endDate.",
  },
  today: {
    en: ":input must be today.",
    ar: ":input يجب أن يكون اليوم.",
  },
  fromToday: {
    en: ":input must be today or in the future.",
    ar: ":input يجب أن يكون اليوم أو في المستقبل.",
  },
  beforeToday: {
    en: ":input must be before today.",
    ar: ":input يجب أن يكون قبل اليوم.",
  },
  afterToday: {
    en: ":input must be after today.",
    ar: ":input يجب أن يكون بعد اليوم.",
  },
  future: {
    en: ":input must be in the future",
    ar: ":input يجب أن يكون في المستقبل",
  },
  past: {
    en: ":input must be in the past",
    ar: ":input يجب أن يكون في الماضي",
  },
  betweenYears: {
    en: ":input must be between :startYear and :endYear.",
    ar: ":input يجب أن يكون بين :startYear و :endYear.",
  },
  betweenMonths: {
    en: ":input must be between month :startMonth and :endMonth.",
    ar: ":input يجب أن يكون بين شهر :startMonth و :endMonth.",
  },
  betweenDays: {
    en: ":input must be between day :startDay and :endDay.",
    ar: ":input يجب أن يكون بين يوم :startDay و :endDay.",
  },
  minYear: {
    en: ":input year must be at least :yearOrField.",
    ar: "سنة :input يجب أن تكون على الأقل :yearOrField.",
  },
  maxYear: {
    en: ":input year must be at most :yearOrField.",
    ar: "سنة :input يجب أن تكون على الأكثر :yearOrField.",
  },
  minMonth: {
    en: ":input month must be at least :monthOrField.",
    ar: "شهر :input يجب أن يكون على الأقل :monthOrField.",
  },
  maxMonth: {
    en: ":input month must be at most :monthOrField.",
    ar: "شهر :input يجب أن يكون على الأكثر :monthOrField.",
  },
  minDay: {
    en: ":input day must be at least :dayOrField.",
    ar: "يوم :input يجب أن يكون على الأقل :dayOrField.",
  },
  maxDay: {
    en: ":input day must be at most :dayOrField.",
    ar: "يوم :input يجب أن يكون على الأكثر :dayOrField.",
  },
  month: {
    en: ":input must be in month :month.",
    ar: ":input يجب أن يكون في شهر :month.",
  },
  year: {
    en: ":input must be in year :year.",
    ar: ":input يجب أن يكون في سنة :year.",
  },
  quarter: {
    en: ":input must be in quarter :quarter.",
    ar: ":input يجب أن يكون في ربع :quarter.",
  },
  betweenTimes: {
    en: ":input must be between :startTime and :endTime.",
    ar: ":input يجب أن يكون بين :startTime و :endTime.",
  },
  fromHour: {
    en: ":input must be from hour :hour onwards.",
    ar: ":input يجب أن يكون من الساعة :hour فصاعداً.",
  },
  beforeHour: {
    en: ":input must be before hour :hour.",
    ar: ":input يجب أن يكون قبل الساعة :hour.",
  },
  betweenHours: {
    en: ":input must be between hour :startHour and :endHour.",
    ar: ":input يجب أن يكون بين الساعة :startHour و :endHour.",
  },
  fromMinute: {
    en: ":input must be from minute :minute onwards.",
    ar: ":input يجب أن يكون من الدقيقة :minute فصاعداً.",
  },
  beforeMinute: {
    en: ":input must be before minute :minute.",
    ar: ":input يجب أن يكون قبل الدقيقة :minute.",
  },
  betweenMinutes: {
    en: ":input must be between minute :startMinute and :endMinute.",
    ar: ":input يجب أن يكون بين الدقيقة :startMinute و :endMinute.",
  },
  age: {
    en: ":input age must be exactly :years years.",
    ar: "عمر :input يجب أن يكون بالضبط :years سنة.",
  },
  minAge: {
    en: ":input age must be at least :years years.",
    ar: "عمر :input يجب أن يكون على الأقل :years سنة.",
  },
  maxAge: {
    en: ":input age must be at most :years years.",
    ar: "عمر :input يجب أن يكون على الأكثر :years سنة.",
  },
  betweenAge: {
    en: ":input age must be between :minAge and :maxAge years.",
    ar: "عمر :input يجب أن يكون بين :minAge و :maxAge سنة.",
  },
  weekDay: {
    en: ":input must be on :day.",
    ar: ":input يجب أن يكون يوم :day.",
  },
  weekday: {
    en: ":input must be a weekday.",
    ar: ":input يجب أن يكون يوم عمل.",
  },
  weekdays: {
    en: ":input must be one of the following weekdays: :days.",
    ar: ":input يجب أن يكون أحد أيام الأسبوع التالية: :days.",
  },
  weekend: {
    en: ":input must be a weekend.",
    ar: ":input يجب أن يكون عطلة نهاية الأسبوع.",
  },
  businessDay: {
    en: ":input must be a business day.",
    ar: ":input يجب أن يكون يوم عمل.",
  },
  birthday: {
    en: ":input must be a valid birthday.",
    ar: ":input يجب أن يكون تاريخ ميلاد صالح.",
  },
  leapYear: {
    en: ":input must be in a leap year.",
    ar: ":input يجب أن يكون في سنة كبيسة.",
  },
  withinDays: {
    en: ":input must be within :days days.",
    ar: ":input يجب أن يكون خلال :days يوم.",
  },
  withinPastDays: {
    en: ":input must be within the past :days days.",
    ar: ":input يجب أن يكون خلال :days يوم الماضية.",
  },
  withinFutureDays: {
    en: ":input must be within the next :days days.",
    ar: ":input يجب أن يكون خلال :days يوم القادمة.",
  },
  requiredIf: {
    en: ":input is required when :field is :value.",
    ar: ":input مطلوب عندما يكون :field :value.",
  },
  requiredIfEmpty: {
    en: ":input is required when :field is empty.",
    ar: ":input مطلوب عندما يكون :field فارغ.",
  },
  requiredIfNotEmpty: {
    en: ":input is required when :field is not empty.",
    ar: ":input مطلوب عندما لا يكون :field فارغ.",
  },
  requiredIfIn: {
    en: ":input is required when :field is one of :values.",
    ar: ":input مطلوب عندما يكون :field أحد :values.",
  },
  requiredIfNotIn: {
    en: ":input is required when :field is not one of :values.",
    ar: ":input مطلوب عندما لا يكون :field أحد :values.",
  },
  requiredUnless: {
    en: ":input is required unless :field is :value.",
    ar: ":input مطلوب ما لم يكن :field :value.",
  },
  requiredWith: {
    en: ":input is required when :field is present.",
    ar: ":input مطلوب عندما يكون :field موجود.",
  },
  requiredWithAll: {
    en: ":input is required when all of :fields are present.",
    ar: ":input مطلوب عندما تكون جميع :fields موجودة.",
  },
  requiredWithAny: {
    en: ":input is required when any of :fields are present.",
    ar: ":input مطلوب عندما يكون أي من :fields موجود.",
  },
  requiredWithout: {
    en: ":input is required when :field is not present.",
    ar: ":input مطلوب عندما لا يكون :field موجود.",
  },
  requiredWithoutAll: {
    en: ":input is required when none of :fields are present.",
    ar: ":input مطلوب عندما لا تكون أي من :fields موجودة.",
  },
  requiredWithoutAny: {
    en: ":input is required when any of :fields are not present.",
    ar: ":input مطلوب عندما لا يكون أي من :fields موجود.",
  },
  presentIf: {
    en: ":input must be present when :field is :value.",
    ar: ":input يجب أن يكون موجود عندما يكون :field :value.",
  },
  presentIfEmpty: {
    en: ":input must be present when :field is empty.",
    ar: ":input يجب أن يكون موجود عندما يكون :field فارغ.",
  },
  presentIfNotEmpty: {
    en: ":input must be present when :field is not empty.",
    ar: ":input يجب أن يكون موجود عندما لا يكون :field فارغ.",
  },
  presentIfIn: {
    en: ":input must be present when :field is one of :values.",
    ar: ":input يجب أن يكون موجود عندما يكون :field أحد :values.",
  },
  presentIfNotIn: {
    en: ":input must be present when :field is not one of :values.",
    ar: ":input يجب أن يكون موجود عندما لا يكون :field أحد :values.",
  },
  presentUnless: {
    en: ":input must be present unless :field is :value.",
    ar: ":input يجب أن يكون موجود ما لم يكن :field :value.",
  },
  presentWith: {
    en: ":input must be present when :field is present.",
    ar: ":input يجب أن يكون موجود عندما يكون :field موجود.",
  },
  presentWithAll: {
    en: ":input must be present when all of :fields are present.",
    ar: ":input يجب أن يكون موجود عندما تكون جميع :fields موجودة.",
  },
  presentWithAny: {
    en: ":input must be present when any of :fields are present.",
    ar: ":input يجب أن يكون موجود عندما يكون أي من :fields موجود.",
  },
  presentWithout: {
    en: ":input must be present when :field is not present.",
    ar: ":input يجب أن يكون موجود عندما لا يكون :field موجود.",
  },
  presentWithoutAll: {
    en: ":input must be present when none of :fields are present.",
    ar: ":input يجب أن يكون موجود عندما لا تكون أي من :fields موجودة.",
  },
  presentWithoutAny: {
    en: ":input must be present when any of :fields are not present.",
    ar: ":input يجب أن يكون موجود عندما لا يكون أي من :fields موجود.",
  },
  accepted: {
    en: ":input must be accepted.",
    ar: ":input يجب أن يكون مقبول.",
  },
  acceptedIf: {
    en: ":input must be accepted when :field is :value.",
    ar: ":input يجب أن يكون مقبول عندما يكون :field :value.",
  },
  acceptedUnless: {
    en: ":input must be accepted unless :field is :value.",
    ar: ":input يجب أن يكون مقبول ما لم يكن :field :value.",
  },
  acceptedIfRequired: {
    en: ":input must be accepted when :field is required.",
    ar: ":input يجب أن يكون مقبول عندما يكون :field مطلوب.",
  },
  acceptedIfPresent: {
    en: ":input must be accepted when :field is present.",
    ar: ":input يجب أن يكون مقبول عندما يكون :field موجود.",
  },
  acceptedWithout: {
    en: ":input must be accepted when :field is not present.",
    ar: ":input يجب أن يكون مقبول عندما لا يكون :field موجود.",
  },
  declined: {
    en: ":input must be declined.",
    ar: ":input يجب أن يكون مرفوض.",
  },
  declinedIf: {
    en: ":input must be declined when :field is :value.",
    ar: ":input يجب أن يكون مرفوض عندما يكون :field :value.",
  },
  declinedUnless: {
    en: ":input must be declined unless :field is :value.",
    ar: ":input يجب أن يكون مرفوض ما لم يكن :field :value.",
  },
  declinedIfRequired: {
    en: ":input must be declined when :field is required.",
    ar: ":input يجب أن يكون مرفوض عندما يكون :field مطلوب.",
  },
  declinedIfPresent: {
    en: ":input must be declined when :field is present.",
    ar: ":input يجب أن يكون مرفوض عندما يكون :field موجود.",
  },
  declinedWithout: {
    en: ":input must be declined when :field is not present.",
    ar: ":input يجب أن يكون مرفوض عندما لا يكون :field موجود.",
  },
});

// Attributes translations
groupedTranslations("attributes", {
  email: {
    en: "Email",
    ar: "البريد الإلكتروني",
  },
  phoneNumber: {
    en: "Phone Number",
    ar: "رقم الهاتف",
  },
  firstName: {
    en: "First Name",
    ar: "الاسم الأول",
  },
  lastName: {
    en: "Last Name",
    ar: "الاسم الأخير",
  },
  password: {
    en: "Password",
    ar: "كلمة المرور",
  },
  name: {
    en: "Name",
    ar: "الاسم",
  },
});
