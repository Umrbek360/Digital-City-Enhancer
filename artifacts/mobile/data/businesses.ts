import type { ImageSourcePropType } from 'react-native';
import type { PublicBusiness } from '@workspace/api-client-react';

export type BusinessCategory = 'Ovqatlanish' | 'Go‘zallik' | 'Sog‘liq' | 'Ta’lim';

export type Service = {
  id: string;
  name: string;
  duration: string;
  price: string;
};

export type Business = {
  id: string;
  name: string;
  category: BusinessCategory;
  address: string;
  distance?: string;
  rating?: string;
  reviewCount: number;
  status: 'Ochiq' | 'Yopiq' | 'Tasdiqlandi';
  accent: string;
  image?: ImageSourcePropType | null;
  description: string;
  hours: string;
  phone?: string;
  services: Service[];
  pin: { top: number; left: number };
  isDirectoryListing?: boolean;
  isExample?: boolean;
};

const categoryAccents: Record<BusinessCategory, string> = {
  Ovqatlanish: '#b66a21',
  'Go‘zallik': '#a64478',
  'Sog‘liq': '#2f8065',
  'Ta’lim': '#6854a3',
};

export function mapPublicBusinessToDirectory(business: PublicBusiness, index = 0): Business {
  return {
    id: business.id,
    name: business.name,
    category: business.category,
    address: business.address,
    distance: undefined,
    rating: undefined,
    reviewCount: 0,
    status: 'Tasdiqlandi',
    accent: categoryAccents[business.category],
    image: null,
    description: business.description,
    hours: business.hours,
    phone: business.phone,
    services: [],
    pin: {
      top: 24 + ((index * 29) % 52),
      left: 19 + ((index * 37) % 62),
    },
    isDirectoryListing: true,
  };
}

const exampleBusinesses: Business[] = [
  {
    id: 'rayhon-coffee',
    name: 'Rayhon Coffee',
    category: 'Ovqatlanish',
    address: 'Afrosiyob ko‘chasi, 12',
    reviewCount: 0,
    status: 'Ochiq',
    accent: '#D97706',
    image: require('../assets/images/coffee-shop.jpg'),
    description:
      'Yangi qovurilgan qahva, uy pishiriqlari va shahar markazidagi sokin uchrashuvlar uchun qulay joy.',
    hours: 'Har kuni 08:00–23:00',
    services: [
      { id: 'americano', name: 'Americano', duration: '5 daqiqa', price: '22 000 so‘m' },
      { id: 'cappuccino', name: 'Cappuccino', duration: '7 daqiqa', price: '28 000 so‘m' },
      { id: 'breakfast', name: 'Nonushta seti', duration: '20 daqiqa', price: '48 000 so‘m' },
    ],
    pin: { top: 30, left: 27 },
    isExample: true,
  },
  {
    id: 'chiroy-salon',
    name: 'Chiroy Studio',
    category: 'Go‘zallik',
    address: 'Shahrisabz ko‘chasi, 7',
    reviewCount: 0,
    status: 'Ochiq',
    accent: '#DB2777',
    image: require('../assets/images/hair-salon.jpg'),
    description:
      'Soch turmaklash, parvarish va kundalik go‘zallik xizmatlari uchun zamonaviy studiya.',
    hours: 'Har kuni 09:00–20:00',
    services: [
      { id: 'cut', name: 'Soch olish', duration: '45 daqiqa', price: '80 000 so‘m' },
      { id: 'styling', name: 'Soch turmaklash', duration: '60 daqiqa', price: '120 000 so‘m' },
      { id: 'care', name: 'Soch parvarishi', duration: '40 daqiqa', price: '150 000 so‘m' },
    ],
    pin: { top: 47, left: 67 },
    isExample: true,
  },
  {
    id: 'salomat-pharm',
    name: 'Salomat Dorixona',
    category: 'Sog‘liq',
    address: 'Bobur ko‘chasi, 31',
    reviewCount: 0,
    status: 'Ochiq',
    accent: '#059669',
    image: require('../assets/images/pharmacy.jpg'),
    description:
      'Kundalik salomatlik ehtiyojlari, vitaminlar va maslahat uchun yaqin dorixona.',
    hours: '24 soat ochiq',
    services: [
      { id: 'consult', name: 'Farmatsevt maslahati', duration: '15 daqiqa', price: 'Bepul' },
      { id: 'delivery', name: 'Yetkazib berish', duration: '30–60 daqiqa', price: '25 000 so‘m' },
    ],
    pin: { top: 66, left: 43 },
    isExample: true,
  },
  {
    id: 'ustoz-education',
    name: 'Ustoz Academy',
    category: 'Ta’lim',
    address: 'Oybek ko‘chasi, 18',
    reviewCount: 0,
    status: 'Yopiq',
    accent: '#7C3AED',
    image: require('../assets/images/coffee-shop.jpg'),
    description:
      'Ingliz tili va matematika bo‘yicha kichik guruhlar uchun amaliy darslar.',
    hours: 'Dushanba–Shanba 10:00–19:00',
    services: [
      { id: 'english', name: 'Ingliz tili sinov darsi', duration: '60 daqiqa', price: 'Bepul' },
      { id: 'math', name: 'Matematika konsultatsiyasi', duration: '45 daqiqa', price: '70 000 so‘m' },
    ],
    pin: { top: 22, left: 78 },
    isExample: true,
  },
];

// Keep recognizable sample content in the development preview, but never ship
// fabricated businesses in a production build.
export const businesses: Business[] =
  typeof __DEV__ !== 'undefined' && __DEV__ ? exampleBusinesses : [];

export const categories = [
  { value: 'Barchasi' as const, label: 'Barchasi', icon: 'grid' as const },
  { value: 'Ovqatlanish' as const, label: 'Ovqat', icon: 'coffee' as const },
  { value: 'Go‘zallik' as const, label: 'Go‘zallik', icon: 'scissors' as const },
  { value: 'Sog‘liq' as const, label: 'Sog‘liq', icon: 'heart' as const },
  { value: 'Ta’lim' as const, label: 'Ta’lim', icon: 'book-open' as const },
];

export function getBusiness(id: string | string[] | undefined) {
  const businessId = Array.isArray(id) ? id[0] : id;
  return businesses.find((business) => business.id === businessId);
}