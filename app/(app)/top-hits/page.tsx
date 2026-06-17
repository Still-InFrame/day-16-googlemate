import Link from "next/link";
import { Target, Search } from "lucide-react";
import { getTopHitsLeads, getSearch } from "@/lib/queries";
import { PageHeader } from "@/components/app-shell";
import { TopHitsClient } from "@/components/top-hits-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function TopHitsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search: searchId } = await searchParams;
  const [leads, focusSearch] = await Promise.all([
    getTopHitsLeads(),
    searchId ? getSearch(searchId) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <PageHeader
        title="Top Hits"
        subtitle="Your best-fit prospects across every scan. Filter by niche or location."
        actions={
          <Link href="/search">
            <Button variant="outline" size="sm">
              <Search className="h-4 w-4" /> New scan
            </Button>
          </Link>
        }
      />

      <div className="mt-6">
        {leads.length === 0 ? (
          <Card className="grid place-items-center px-6 py-16 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
              <Target className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-ink">No hits yet</h3>
            <p className="mt-1 max-w-sm text-sm text-ink-soft">
              Run a scan to find local businesses worth pitching. Your best
              prospects will land right here.
            </p>
            <Link href="/search" className="mt-5">
              <Button>
                <Search className="h-4 w-4" /> Start a scan
              </Button>
            </Link>
          </Card>
        ) : (
          <TopHitsClient
            leads={leads}
            initialLocation={focusSearch?.location ?? "all"}
            initialKeyword={focusSearch?.keyword ?? "all"}
          />
        )}
      </div>
    </div>
  );
}
