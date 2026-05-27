import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFoodTimes(food: { postedAt: string; expiryHours: number; tags?: string[] }) {
  const postedTime = new Date(food.postedAt).getTime();
  const validPostedTime = isNaN(postedTime) ? Date.now() : postedTime;
  const primaryExpiry = validPostedTime + food.expiryHours * 60 * 60 * 1000;
  
  let graceHours = 3;
  if (food.tags) {
    const graceTag = food.tags.find((t) => t.startsWith("grace-hours:"));
    if (graceTag) {
      const parsed = parseInt(graceTag.split(":")[1], 10);
      if (!isNaN(parsed)) {
        graceHours = parsed;
      }
    }
  }

  const secondaryExpiry = primaryExpiry + graceHours * 60 * 60 * 1000;
  return { primaryExpiry, secondaryExpiry, graceHours };
}


