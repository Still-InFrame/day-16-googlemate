"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/queries";

export async function saveBusinessInfo(
  formData: FormData,
): Promise<{ error?: string }> {
  const business_name = String(formData.get("business_name") ?? "").trim();
  const services = String(formData.get("services") ?? "").trim();
  const ideal_customer = String(formData.get("ideal_customer") ?? "").trim();
  const value_prop = String(formData.get("value_prop") ?? "").trim();
  const voice = String(formData.get("voice") ?? "").trim();
  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!business_name || !services) {
    return { error: "Business name and what you do are required." };
  }

  const { user, supabase } = await requireUser();
  const { error } = await supabase.from("googlemate_business_info").upsert(
    {
      user_id: user.id,
      business_name,
      services,
      ideal_customer: ideal_customer || null,
      value_prop: value_prop || null,
      voice: voice || null,
      first_name: first_name || null,
      last_name: last_name || null,
      phone: phone || null,
      email: email || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/business-info");
  revalidatePath("/search");
  return {};
}
