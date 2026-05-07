import { useScreenType } from "@/hooks/useScreenType";
import { trackCategoryView } from "@/lib/analytics";
import { Category } from "@/types/ApiResponse";
import { Card, Image } from "@heroui/react";
import Link from "next/link";
import { FC, memo } from "react";

interface CategoryCardProps {
  category: Category;
}

const CategoryCard: FC<CategoryCardProps> = ({ category }) => {
  const link = category?.parent_slug
    ? `/categories/${category.parent_slug}?subcategory=${category.slug}`
    : `/categories/${category.slug}`;

  const screen = useScreenType();

  return (
    <div className="flex flex-col items-center w-full min-w-0">
      <div className="w-full max-w-full overflow-hidden flex items-center justify-center">
        <Card
          className="relative overflow-hidden w-full h-24 sm:h-28 p-0 hover:scale-110 transition-transform border-none rounded-3xl bg-transparent"
          shadow="none"
          isPressable={screen !== "mobile"}
          as={Link}
          href={link}
          title={category.title}
          onPress={() =>
            trackCategoryView(category?.id?.toString(), category?.title)
          }
        >
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 flex justify-center w-full">
            <Image
              src={category.image}
              alt={category.title}
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain block"
              classNames={{
                img: "rounded-lg object-contain block",
              }}
              loading="eager"
              removeWrapper
            />
          </div>
        </Card>
      </div>
      <div className="h-8 flex items-center w-full min-w-0">
        <h2
          title={category.title}
          className="text-center truncate w-full text-xs font-medium px-1"
        >
          {category.title}
        </h2>
      </div>
    </div>
  );
};

export default memo(CategoryCard);
