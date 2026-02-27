"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

type MemberRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
};

export default function MembersListClient({
  initialMembers,
  myUserId,
  myRole,
  superAdminEmail,
}: {
  initialMembers: MemberRow[];
  myUserId: string;
  myRole: string;
  superAdminEmail: string;
}) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [members, setMembers] = useState<MemberRow[]>(initialMembers ?? []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string>("");

  const isAdmin = String(myRole ?? "").toLowerCase().trim() === "admin";

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const em = (data.user?.email ?? "").toLowerCase().trim();
      setSessionEmail(em);
    })();
  }, [supabase]);

  const isSuperAdmin =
    !!superAdminEmail &&
    !!sessionEmail &&
    sessionEmail.toLowerCase().trim() === superAdminEmail.toLowerCase().trim();

  const adminCount = members.filter(
    (m) => String(m.role ?? "").toLowerCase().trim() === "admin"
  ).length;

  async function deleteUser(userId: string, name: string) {
    const ok = confirm(
      `Delete ${name} forever?\n\nThis removes their account completely (including login).`
    );
    if (!ok) return;

    setMsg(null);
    setBusyId(userId);

    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    setBusyId(null);

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(json?.error ?? "Delete failed.");
      return;
    }

    setMembers((prev) => prev.filter((m) => m.id !== userId));
    setMsg("Member deleted successfully.");
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div className="rounded-2xl border border-rose-200 bg-white/90 p-4 text-sm font-medium text-rose-700 shadow-sm">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-pink-200 bg-white/85 p-5 shadow-sm backdrop-blur">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-pink-600">Total Members</div>
          <div className="mt-2 text-3xl font-semibold text-pink-900">{members.length}</div>
        </div>
        <div className="rounded-2xl border border-fuchsia-200 bg-white/85 p-5 shadow-sm backdrop-blur">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-fuchsia-600">Admins</div>
          <div className="mt-2 text-3xl font-semibold text-fuchsia-900">{adminCount}</div>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-white/85 p-5 shadow-sm backdrop-blur">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-600">Members</div>
          <div className="mt-2 text-3xl font-semibold text-rose-900">{Math.max(members.length - adminCount, 0)}</div>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="rounded-3xl border border-pink-200 bg-white/90 px-6 py-12 text-center shadow-sm backdrop-blur">
          <div className="text-2xl font-semibold text-pink-900">No members available</div>
          <div className="mt-2 text-sm text-rose-700">Once members join, they will appear here.</div>
        </div>
      ) : (
        <div className="grid gap-5">
          {members.map((m, idx) => {
            const role = String(m.role ?? "").toLowerCase().trim();
            const isTargetAdmin = role === "admin";
            const isMe = m.id === myUserId;

            const canDelete =
              isAdmin && !isMe && (!isTargetAdmin || isSuperAdmin);

            const name = (m.full_name ?? "Member").trim() || "Member";
            const initials = name
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? "")
              .join("");

            return (
              <div
                key={m.id}
                className="animate-rise-in rounded-3xl border border-pink-100 bg-white/90 p-8 shadow-sm backdrop-blur"
                style={{ animationDelay: `${120 + idx * 55}ms`, animationFillMode: "both" }}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-5">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-500 text-base font-bold text-white">
                      {initials || "M"}
                    </div>

                    <div>
                      <div className="text-2xl font-semibold text-gray-900">{name}</div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={[
                            "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-semibold",
                            isTargetAdmin
                              ? "border-pink-200 bg-pink-50 text-pink-700"
                              : "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
                          ].join(" ")}
                        >
                          {isTargetAdmin ? "Admin" : "Member"}
                        </span>

                        {isMe && (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-600">
                            You
                          </span>
                        )}

                        {isTargetAdmin && !isSuperAdmin && isAdmin && !isMe && (
                          <span className="text-xs font-medium text-slate-500">
                            Only Super Admin can delete admins
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {canDelete ? (
                    <button
                      disabled={busyId === m.id}
                      onClick={() => deleteUser(m.id, name)}
                      className="rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      {busyId === m.id ? "Deleting..." : "Delete"}
                    </button>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
