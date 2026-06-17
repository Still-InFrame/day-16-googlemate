import { getBusinessInfo } from "@/lib/queries";
import { PageHeader } from "@/components/app-shell";
import { BusinessInfoForm } from "@/components/business-info-form";
import { Card, CardContent } from "@/components/ui/card";

export default async function BusinessInfoPage() {
  const info = await getBusinessInfo();

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
      <PageHeader
        title="My Business"
        subtitle="Tell googlemate about your business so every lead is scored and pitched through your lens."
      />
      <Card className="mt-6">
        <CardContent>
          <BusinessInfoForm info={info} />
        </CardContent>
      </Card>
    </div>
  );
}
