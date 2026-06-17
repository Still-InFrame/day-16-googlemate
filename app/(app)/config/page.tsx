import { getSettings } from "@/lib/queries";
import { PageHeader } from "@/components/app-shell";
import { ConfigForm } from "@/components/config-form";
import { CrmForm } from "@/components/crm-form";
import { ChangePasswordForm } from "@/components/change-password-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default async function ConfigPage() {
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-5 py-8 sm:px-8">
      <PageHeader
        title="Settings"
        subtitle="Manage your AI provider, CRM connection, and account."
      />

      <Card>
        <CardHeader>
          <CardTitle>AI provider & scanning</CardTitle>
          <CardDescription>
            The model used to rank leads and write pitches, plus how many leads
            each scan keeps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConfigForm settings={settings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            CRM connection
            <Badge tone="amber">Coming soon</Badge>
          </CardTitle>
          <CardDescription>
            Connect a CRM to save prospects and send outreach from it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CrmForm settings={settings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
