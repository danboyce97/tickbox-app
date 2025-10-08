/**
 * Currency Utilities
 * 
 * Provides currency symbols, names, and conversion helpers
 */

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  popular?: boolean;
}

export const CURRENCIES: CurrencyInfo[] = [
  // Popular currencies (shown at top)
  { code: "USD", symbol: "$", name: "US Dollar", popular: true },
  { code: "GBP", symbol: "£", name: "British Pound", popular: true },
  { code: "EUR", symbol: "€", name: "Euro", popular: true },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", popular: true },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", popular: true },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", popular: true },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", popular: true },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc", popular: true },
  
  // All other currencies (alphabetical)
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "AFN", symbol: "؋", name: "Afghan Afghani" },
  { code: "ALL", symbol: "L", name: "Albanian Lek" },
  { code: "AMD", symbol: "֏", name: "Armenian Dram" },
  { code: "ANG", symbol: "ƒ", name: "Netherlands Antillean Guilder" },
  { code: "AOA", symbol: "Kz", name: "Angolan Kwanza" },
  { code: "ARS", symbol: "$", name: "Argentine Peso" },
  { code: "AWG", symbol: "ƒ", name: "Aruban Florin" },
  { code: "AZN", symbol: "₼", name: "Azerbaijani Manat" },
  { code: "BAM", symbol: "КМ", name: "Bosnia-Herzegovina Convertible Mark" },
  { code: "BBD", symbol: "$", name: "Barbadian Dollar" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
  { code: "BGN", symbol: "лв", name: "Bulgarian Lev" },
  { code: "BHD", symbol: ".د.ب", name: "Bahraini Dinar" },
  { code: "BIF", symbol: "Fr", name: "Burundian Franc" },
  { code: "BMD", symbol: "$", name: "Bermudian Dollar" },
  { code: "BND", symbol: "$", name: "Brunei Dollar" },
  { code: "BOB", symbol: "Bs.", name: "Bolivian Boliviano" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "BSD", symbol: "$", name: "Bahamian Dollar" },
  { code: "BTN", symbol: "Nu.", name: "Bhutanese Ngultrum" },
  { code: "BWP", symbol: "P", name: "Botswanan Pula" },
  { code: "BYN", symbol: "Br", name: "Belarusian Ruble" },
  { code: "BZD", symbol: "$", name: "Belize Dollar" },
  { code: "CDF", symbol: "Fr", name: "Congolese Franc" },
  { code: "CLP", symbol: "$", name: "Chilean Peso" },
  { code: "COP", symbol: "$", name: "Colombian Peso" },
  { code: "CRC", symbol: "₡", name: "Costa Rican Colón" },
  { code: "CUP", symbol: "$", name: "Cuban Peso" },
  { code: "CVE", symbol: "$", name: "Cape Verdean Escudo" },
  { code: "CZK", symbol: "Kč", name: "Czech Koruna" },
  { code: "DJF", symbol: "Fr", name: "Djiboutian Franc" },
  { code: "DKK", symbol: "kr", name: "Danish Krone" },
  { code: "DOP", symbol: "$", name: "Dominican Peso" },
  { code: "DZD", symbol: "د.ج", name: "Algerian Dinar" },
  { code: "EGP", symbol: "£", name: "Egyptian Pound" },
  { code: "ERN", symbol: "Nfk", name: "Eritrean Nakfa" },
  { code: "ETB", symbol: "Br", name: "Ethiopian Birr" },
  { code: "FJD", symbol: "$", name: "Fijian Dollar" },
  { code: "FKP", symbol: "£", name: "Falkland Islands Pound" },
  { code: "FOK", symbol: "kr", name: "Faroese Króna" },
  { code: "GEL", symbol: "₾", name: "Georgian Lari" },
  { code: "GGP", symbol: "£", name: "Guernsey Pound" },
  { code: "GHS", symbol: "₵", name: "Ghanaian Cedi" },
  { code: "GIP", symbol: "£", name: "Gibraltar Pound" },
  { code: "GMD", symbol: "D", name: "Gambian Dalasi" },
  { code: "GNF", symbol: "Fr", name: "Guinean Franc" },
  { code: "GTQ", symbol: "Q", name: "Guatemalan Quetzal" },
  { code: "GYD", symbol: "$", name: "Guyanese Dollar" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { code: "HNL", symbol: "L", name: "Honduran Lempira" },
  { code: "HRK", symbol: "kn", name: "Croatian Kuna" },
  { code: "HTG", symbol: "G", name: "Haitian Gourde" },
  { code: "HUF", symbol: "Ft", name: "Hungarian Forint" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
  { code: "ILS", symbol: "₪", name: "Israeli New Shekel" },
  { code: "IMP", symbol: "£", name: "Manx Pound" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "IQD", symbol: "ع.د", name: "Iraqi Dinar" },
  { code: "IRR", symbol: "﷼", name: "Iranian Rial" },
  { code: "ISK", symbol: "kr", name: "Icelandic Króna" },
  { code: "JEP", symbol: "£", name: "Jersey Pound" },
  { code: "JMD", symbol: "$", name: "Jamaican Dollar" },
  { code: "JOD", symbol: "د.ا", name: "Jordanian Dinar" },
  { code: "KES", symbol: "Sh", name: "Kenyan Shilling" },
  { code: "KGS", symbol: "с", name: "Kyrgyzstani Som" },
  { code: "KHR", symbol: "៛", name: "Cambodian Riel" },
  { code: "KID", symbol: "$", name: "Kiribati Dollar" },
  { code: "KMF", symbol: "Fr", name: "Comorian Franc" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
  { code: "KWD", symbol: "د.ك", name: "Kuwaiti Dinar" },
  { code: "KYD", symbol: "$", name: "Cayman Islands Dollar" },
  { code: "KZT", symbol: "₸", name: "Kazakhstani Tenge" },
  { code: "LAK", symbol: "₭", name: "Lao Kip" },
  { code: "LBP", symbol: "ل.ل", name: "Lebanese Pound" },
  { code: "LKR", symbol: "Rs", name: "Sri Lankan Rupee" },
  { code: "LRD", symbol: "$", name: "Liberian Dollar" },
  { code: "LSL", symbol: "L", name: "Lesotho Loti" },
  { code: "LYD", symbol: "ل.د", name: "Libyan Dinar" },
  { code: "MAD", symbol: "د.م.", name: "Moroccan Dirham" },
  { code: "MDL", symbol: "L", name: "Moldovan Leu" },
  { code: "MGA", symbol: "Ar", name: "Malagasy Ariary" },
  { code: "MKD", symbol: "ден", name: "Macedonian Denar" },
  { code: "MMK", symbol: "K", name: "Myanmar Kyat" },
  { code: "MNT", symbol: "₮", name: "Mongolian Tögrög" },
  { code: "MOP", symbol: "P", name: "Macanese Pataca" },
  { code: "MRU", symbol: "UM", name: "Mauritanian Ouguiya" },
  { code: "MUR", symbol: "₨", name: "Mauritian Rupee" },
  { code: "MVR", symbol: ".ރ", name: "Maldivian Rufiyaa" },
  { code: "MWK", symbol: "MK", name: "Malawian Kwacha" },
  { code: "MXN", symbol: "$", name: "Mexican Peso" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { code: "MZN", symbol: "MT", name: "Mozambican Metical" },
  { code: "NAD", symbol: "$", name: "Namibian Dollar" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "NIO", symbol: "C$", name: "Nicaraguan Córdoba" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
  { code: "NPR", symbol: "₨", name: "Nepalese Rupee" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  { code: "OMR", symbol: "ر.ع.", name: "Omani Rial" },
  { code: "PAB", symbol: "B/.", name: "Panamanian Balboa" },
  { code: "PEN", symbol: "S/", name: "Peruvian Sol" },
  { code: "PGK", symbol: "K", name: "Papua New Guinean Kina" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso" },
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee" },
  { code: "PLN", symbol: "zł", name: "Polish Złoty" },
  { code: "PYG", symbol: "₲", name: "Paraguayan Guaraní" },
  { code: "QAR", symbol: "ر.ق", name: "Qatari Riyal" },
  { code: "RON", symbol: "lei", name: "Romanian Leu" },
  { code: "RSD", symbol: "дин.", name: "Serbian Dinar" },
  { code: "RUB", symbol: "₽", name: "Russian Ruble" },
  { code: "RWF", symbol: "Fr", name: "Rwandan Franc" },
  { code: "SAR", symbol: "ر.س", name: "Saudi Riyal" },
  { code: "SBD", symbol: "$", name: "Solomon Islands Dollar" },
  { code: "SCR", symbol: "₨", name: "Seychellois Rupee" },
  { code: "SDG", symbol: "ج.س.", name: "Sudanese Pound" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "SHP", symbol: "£", name: "Saint Helena Pound" },
  { code: "SLE", symbol: "Le", name: "Sierra Leonean Leone" },
  { code: "SOS", symbol: "Sh", name: "Somali Shilling" },
  { code: "SRD", symbol: "$", name: "Surinamese Dollar" },
  { code: "SSP", symbol: "£", name: "South Sudanese Pound" },
  { code: "STN", symbol: "Db", name: "São Tomé and Príncipe Dobra" },
  { code: "SYP", symbol: "£", name: "Syrian Pound" },
  { code: "SZL", symbol: "L", name: "Swazi Lilangeni" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "TJS", symbol: "ЅМ", name: "Tajikistani Somoni" },
  { code: "TMT", symbol: "m", name: "Turkmenistani Manat" },
  { code: "TND", symbol: "د.ت", name: "Tunisian Dinar" },
  { code: "TOP", symbol: "T$", name: "Tongan Paʻanga" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { code: "TTD", symbol: "$", name: "Trinidad and Tobago Dollar" },
  { code: "TVD", symbol: "$", name: "Tuvaluan Dollar" },
  { code: "TWD", symbol: "NT$", name: "New Taiwan Dollar" },
  { code: "TZS", symbol: "Sh", name: "Tanzanian Shilling" },
  { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia" },
  { code: "UGX", symbol: "Sh", name: "Ugandan Shilling" },
  { code: "UYU", symbol: "$", name: "Uruguayan Peso" },
  { code: "UZS", symbol: "so'm", name: "Uzbekistani Som" },
  { code: "VES", symbol: "Bs.S", name: "Venezuelan Bolívar" },
  { code: "VND", symbol: "₫", name: "Vietnamese Đồng" },
  { code: "VUV", symbol: "Vt", name: "Vanuatu Vatu" },
  { code: "WST", symbol: "T", name: "Samoan Tālā" },
  { code: "XAF", symbol: "Fr", name: "Central African CFA Franc" },
  { code: "XCD", symbol: "$", name: "East Caribbean Dollar" },
  { code: "XOF", symbol: "Fr", name: "West African CFA Franc" },
  { code: "XPF", symbol: "₣", name: "CFP Franc" },
  { code: "YER", symbol: "﷼", name: "Yemeni Rial" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "ZMW", symbol: "ZK", name: "Zambian Kwacha" },
  { code: "ZWL", symbol: "$", name: "Zimbabwean Dollar" },
];

/**
 * Get popular currencies (for display at top of list)
 */
export const getPopularCurrencies = (): CurrencyInfo[] => {
  return CURRENCIES.filter(c => c.popular);
};

/**
 * Get all non-popular currencies (for display after popular ones)
 */
export const getOtherCurrencies = (): CurrencyInfo[] => {
  return CURRENCIES.filter(c => !c.popular);
};

/**
 * Get currency symbol by code
 */
export const getCurrencySymbol = (code: string): string => {
  const currency = CURRENCIES.find(c => c.code === code);
  return currency?.symbol || code;
};

/**
 * Get currency name by code
 */
export const getCurrencyName = (code: string): string => {
  const currency = CURRENCIES.find(c => c.code === code);
  return currency?.name || code;
};

/**
 * Format price with currency
 */
export const formatCurrency = (amount: number, currencyCode: string): string => {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${amount.toFixed(2)}`;
};