"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function Gallery({ eventId }: { eventId: string }) {
  const supabase = createSupabaseBrowser();
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("gallery_photos")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    setPhotos(data ?? []);
  }

  useEffect(() => { load(); }, []);

  async function upload(file: File) {
    setUploading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;

    const path = `event-${eventId}/${u.user.id}/${Date.now()}-${file.name}`;
    const up = await supabase.storage.from("gallery").upload(path, file, {
      upsert: false,
      contentType: file.type,
    });
    if (up.error) {
      alert(up.error.message);
      setUploading(false);
      return;
    }

    const ins = await supabase.from("gallery_photos").insert({
      event_id: eventId,
      uploaded_by: u.user.id,
      storage_path: path,
      hidden: false,
    });
    if (ins.error) alert(ins.error.message);

    setUploading(false);
    await load();
  }

  return (
    <div className="rounded border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Photo gallery</div>
        <label className="cursor-pointer rounded border px-3 py-2 text-sm">
          {uploading ? "Uploading..." : "Upload photo"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.currentTarget.value = "";
            }}
            disabled={uploading}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((p) => {
          const { data } = supabase.storage.from("gallery").getPublicUrl(p.storage_path);
          return (
            <img
              key={p.id}
              src={data.publicUrl}
              className="h-40 w-full rounded object-cover"
              alt="Event photo"
              loading="lazy"
            />
          );
        })}
      </div>

      {photos.length === 0 && (
        <div className="text-sm text-muted-foreground">No photos yet.</div>
      )}
    </div>
  );
}
