import { GetServerSideProps } from "next";
import { getDeliveryZones, getSettings } from "@/routes/api";
import React, { useState, useMemo } from "react";
import { isSSR } from "@/helpers/getters";
import MyBreadcrumbs from "@/components/custom/MyBreadcrumbs";
import PageHeader from "@/components/custom/PageHeader";
import InfiniteScroll from "@/components/Functional/InfiniteScroll";
import InfiniteScrollStatus from "@/components/Functional/InfiniteScrollStatus";
import { useInfiniteData } from "@/hooks/useInfiniteData";
import { DeliveryZone, PaginatedResponse } from "@/types/ApiResponse";
import { NextPageWithLayout } from "@/types";
import { ArrowRight, MapPin, Search, X } from "lucide-react";
import NoProductsFound from "@/components/NoProductsFound";
import DeliveryZoneCardSkeleton from "@/components/Skeletons/DeliveryZoneCardSkeleton";
import DeliveryZoneCard from "@/components/Cards/DeliveryZoneCard";
import { loadTranslations } from "../../../i18n";
import PageHead from "@/SEO/PageHead";
import { useTranslation } from "react-i18next";
import { Button, Input } from "@heroui/react";
import { useRouter } from "next/router";

interface DeliveryZonesPageProps {
  initialZones: PaginatedResponse<DeliveryZone[]> | null;
  error?: string;
}

const PER_PAGE = 24;

const DeliveryZonesPage: NextPageWithLayout<DeliveryZonesPageProps> = ({
  initialZones,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: zones,
    isLoading,
    isLoadingMore,
    hasMore,
    total,
    loadMore,
    refetch,
  } = useInfiniteData<DeliveryZone>({
    fetcher: getDeliveryZones,
    perPage: PER_PAGE,
    initialData: initialZones?.data?.data || [],
    initialTotal: initialZones?.data?.total || 0,
    extraParams: {},
  });

  // Client-side filter by zone name
  const filteredZones = useMemo(() => {
    if (!searchQuery.trim()) return zones;
    const q = searchQuery.toLowerCase().trim();
    return zones.filter((z) => z.name?.toLowerCase().includes(q));
  }, [zones, searchQuery]);

  return (
    <>
      <PageHead pageTitle={t("pageTitle.delivery-zones")} />

      <div className="min-h-screen">
        <MyBreadcrumbs
          breadcrumbs={[
            { href: "/delivery-zones", label: t("pageTitle.delivery-zones") },
          ]}
        />

        {/* Hidden refetch button */}
        <button
          id="refetch-delivery-zones-page"
          className="hidden"
          onClick={() => refetch()}
        />

        <PageHeader
          title={t("pages.deliveryZones.title")}
          subtitle={t("pages.deliveryZones.subtitle")}
          highlightText={
            total ? ` ${total} ${t("pages.deliveryZones.totalZones")}` : ""
          }
        />

        {/* Search bar */}
        <div className="mb-6 max-w-md">
          <Input
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder={t("pages.deliveryZones.searchPlaceholder") || "Search delivery zones…"}
            startContent={<Search className="w-4 h-4 text-default-400 shrink-0" />}
            endContent={
              searchQuery ? (
                <button
                  onClick={() => setSearchQuery("")}
                  className="p-0.5 rounded-full hover:bg-default-200"
                >
                  <X className="w-3.5 h-3.5 text-default-400" />
                </button>
              ) : null
            }
            variant="faded"
            radius="lg"
            size="md"
            classNames={{
              inputWrapper: "shadow-none",
            }}
          />
          {searchQuery && (
            <p className="text-xs text-foreground/50 mt-1 ml-1">
              {filteredZones.length}{" "}
              {filteredZones.length === 1 ? "zone" : "zones"} found
            </p>
          )}
        </div>

        {/* Zones Grid */}
        <InfiniteScroll
          hasMore={hasMore && !searchQuery}
          isLoading={isLoadingMore}
          onLoadMore={loadMore}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {isLoading
              ? Array.from({ length: PER_PAGE }).map((_, index) => (
                  <DeliveryZoneCardSkeleton key={index} />
                ))
              : filteredZones.map((zone) => (
                  <DeliveryZoneCard zone={zone} key={zone.id} />
                ))}
          </div>

          {isLoadingMore && !searchQuery && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <DeliveryZoneCardSkeleton key={`loading-${index}`} />
              ))}
            </div>
          )}

          {!isLoading && filteredZones.length === 0 ? (
            searchQuery ? (
              <div className="text-center py-16 flex flex-col items-center gap-3">
                <Search className="w-10 h-10 text-foreground/20" />
                <p className="text-foreground/50 text-sm">
                  No zones match &ldquo;{searchQuery}&rdquo;
                </p>
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              </div>
            ) : (
              <NoProductsFound
                icon={MapPin}
                title={t("pages.deliveryZones.noZonesTitle")}
                description={t("pages.deliveryZones.noZonesDescription")}
                customActions={
                  <div className="flex w-full justify-center items-center">
                    <Button
                      color="primary"
                      className="h-8"
                      variant="solid"
                      onPress={() => router.push("/")}
                      endContent={<ArrowRight size={16} />}
                    >
                      {t("home_title")}
                    </Button>
                  </div>
                }
              />
            )
          ) : (
            !searchQuery && (
              <InfiniteScrollStatus
                entityType="zone"
                total={total}
                hasMore={hasMore}
              />
            )
          )}
        </InfiniteScroll>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps | undefined = isSSR()
  ? async (context) => {
      try {
        const [zonesResult, settingsResult] = await Promise.allSettled([
          getDeliveryZones({ page: 1, per_page: PER_PAGE }),
          getSettings(),
        ]);

        await loadTranslations(context);

        return {
          props: {
            initialZones:
              zonesResult.status === "fulfilled" ? zonesResult.value : null,
            initialSettings:
              settingsResult.status === "fulfilled"
                ? settingsResult.value.data ?? null
                : null,
            error:
              zonesResult.status === "rejected" ||
              settingsResult.status === "rejected"
                ? "Some data failed to load"
                : null,
          },
        };
      } catch (error) {
        console.error("Unexpected error fetching delivery zones:", error);
        return {
          props: {
            initialZones: null,
            initialSettings: null,
            error: "Unexpected failure",
          },
        };
      }
    }
  : undefined;

export default DeliveryZonesPage;
