import { Button } from "@/components/ui/button";
import { useLanguageStore } from "@/store/languageStore";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationControlsProps) {
  const { t } = useLanguageStore();

  const getPaginationItems = () => {
    if (totalPages <= 1) return [];

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  };

  const paginationItems = getPaginationItems();

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        {t("previous")}
      </Button>
      <div className="flex items-center gap-1">
        {paginationItems.map((item, index) =>
          typeof item === "number" ? (
            <Button
              key={`${item}-${index}`}
              variant={currentPage === item ? "default" : "ghost"}
              size="sm"
              onClick={() => onPageChange(item)}
              className="w-8 h-8 p-0"
            >
              {item}
            </Button>
          ) : (
            <span
              key={`dots-${index}`}
              className="flex items-center justify-center w-8 h-8"
            >
              ...
            </span>
          )
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        {t("next")}
      </Button>
    </div>
  );
}
