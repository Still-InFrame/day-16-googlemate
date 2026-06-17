"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

export function ChangePasswordForm() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (pw !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated");
      setPw("");
      setConfirm("");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="New password" hint="At least 6 characters.">
        <Input
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
      </Field>
      <Field label="Confirm new password">
        <Input
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Field>
      <Button type="submit" loading={loading}>
        Update password
      </Button>
    </form>
  );
}
