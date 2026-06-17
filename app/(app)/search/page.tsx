import { getReadiness, getSearchSummaries } from "@/lib/queries";
import { PageHeader } from "@/components/app-shell";
import { SearchClient } from "@/components/search-client";
import { SetupBanner } from "@/components/setup-banner";

export default async function SearchPage() {
  const { hasKey, hasBusinessInfo } = await getReadiness();
  const ready = hasKey && hasBusinessInfo;
  const recentSearches = ready ? await getSearchSummaries() : [];

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <PageHeader
        title="Find leads"
        subtitle="Search a location and niche. AI surfaces the 5 best businesses to pitch."
      />

      <div className="mt-6">
        {ready ? (
          <SearchClient recentSearches={recentSearches} />
        ) : (
          <SetupBanner hasKey={hasKey} hasBusinessInfo={hasBusinessInfo} />
        )}
      </div>
    </div>
  );
}
