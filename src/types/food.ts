export type FoodStatus = "available" | "reserved" | "collected";
export type Purpose = "humans" | "animals" | "both";
export type Confidence = "High" | "Medium" | "Low";
export type Category = "Veg" | "Non-Veg" | "Bakery" | "Fried" | "Sweets";
export type RealtimeStatus = "Still Available" | "Almost Gone" | "Not Available";

export interface Provider {
  id: string;
  name: string;
  trustScore: number;
  badges: string[];
  streak: number;
  reliability: "high" | "low";
  avatar: string;
}

export interface Review {
  id: string;
  user: string;
  rating: number;
  comment: string;
  date: string;
}

export interface FoodItem {
  id: string;
  name: string;
  image: string;
  feeds: number;
  price: number; // 0 = free
  expiryHours: number; // hours from now
  preparedAt: string;
  address: string;
  lat: number;
  lng: number;
  category: Category;
  tags: string[];
  purpose: Purpose;
  safeForAnimals: boolean;
  status: FoodStatus;
  realtimeStatus: RealtimeStatus;
  trustScore: number;
  confidence: Confidence;
  quantity: string;
  notes?: string;
  allowSplit: boolean;
  provider: Provider;
  reviews: Review[];
  postedAt: string;
}
