export type UserRole = "admin" | "member";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string;
  role: UserRole;
  created_at: string;
};

export type EventRow = {
  id: string;
  theme: string;
  starts_at: string;
  location_text: string | null;
  location_url: string | null;
  dress_code: string | null;
  note: string | null;
  flyer_template: string;
  flyer_png_path: string | null;
  flyer_pdf_path: string | null;
  created_by: string;
  created_at: string;
};

export type RSVPRow = {
  event_id: string;
  user_id: string;
  attending: boolean;
  guest_count: number;
  updated_at: string;
};

export type DishRow = {
  event_id: string;
  user_id: string;
  category: string;
  dish_name: string;
  created_at: string;
  updated_at: string;
};

export type GalleryPhotoRow = {
  id: string;
  event_id: string;
  uploaded_by: string;
  storage_path: string;
  hidden: boolean;
  created_at: string;
};

export type AttendanceFinalRow = {
  event_id: string;
  user_id: string;
  showed_up: boolean;
  marked_by_admin: string;
  marked_at: string;
};
