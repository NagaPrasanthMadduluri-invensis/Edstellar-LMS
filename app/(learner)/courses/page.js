import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star } from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";

const courses = [
  {
    name: "PMP Certification Prep",
    hours: "35 hrs",
    modules: "8 modules",
    rating: 4.8,
    stars: 4,
    price: "₹49,999",
    tier: "Gold",
    tierBg: "bg-navy",
    gradient: "bg-navy",
  },
  {
    name: "ITIL 4 Foundation",
    hours: "24 hrs",
    modules: "6 modules",
    rating: 4.6,
    stars: 4,
    price: "₹34,999",
    tier: "Silver",
    tierBg: "bg-ink/45",
    gradient: "bg-navy",
  },
  {
    name: "Scrum Master (CSM)",
    hours: "20 hrs",
    modules: "5 modules",
    rating: 4.5,
    stars: 4,
    price: "₹19,999",
    tier: "Bronze",
    tierBg: "bg-navy",
    gradient: "bg-navy",
  },
  {
    name: "Six Sigma Green Belt",
    hours: "30 hrs",
    modules: "7 modules",
    rating: 4.7,
    stars: 5,
    price: "₹39,999",
    tier: "Gold",
    tierBg: "bg-navy",
    gradient: "bg-navy",
  },
  {
    name: "PRINCE2 Foundation",
    hours: "22 hrs",
    modules: "6 modules",
    rating: 4.4,
    stars: 4,
    price: "₹29,999",
    tier: "Silver",
    tierBg: "bg-ink/45",
    gradient: "bg-navy",
  },
  {
    name: "PMI-ACP Certification",
    hours: "28 hrs",
    modules: "7 modules",
    rating: 4.6,
    stars: 4,
    price: "₹44,999",
    tier: "Gold",
    tierBg: "bg-navy",
    gradient: "bg-navy",
  },
];

function StarRating({ filled, total = 5 }) {
  return (
    <Box className="inline-flex gap-0.5">
      {Array.from({ length: total }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < filled ? "fill-navy text-ink/70" : "fill-ink/45 text-paper"}`}
        />
      ))}
    </Box>
  );
}

export default function CourseCatalogPage() {
  return (
    <Box className="space-y-5">
      <PageHeader
        eyebrow="My learning"
        title="Course"
        emphasis="catalog"
        summary="Browse everything available, then request the courses you need."
      />

      {/* ── Filters ── */}
      <Box className="flex items-center gap-3 flex-wrap">
        <Select defaultValue="all">
          <SelectTrigger className="w-[180px] h-9 text-xs bg-white">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="pm">Project Management</SelectItem>
            <SelectItem value="it">IT Service</SelectItem>
            <SelectItem value="agile">Agile</SelectItem>
            <SelectItem value="quality">Quality</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="all">
          <SelectTrigger className="w-[140px] h-9 text-xs bg-white">
            <SelectValue placeholder="All Tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="gold">Gold</SelectItem>
            <SelectItem value="silver">Silver</SelectItem>
            <SelectItem value="bronze">Bronze</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="low">
          <SelectTrigger className="w-[170px] h-9 text-xs bg-white">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Price: Low to High</SelectItem>
            <SelectItem value="high">Price: High to Low</SelectItem>
            <SelectItem value="popular">Popularity</SelectItem>
            <SelectItem value="rating">Rating</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search courses..."
          className="w-[200px] h-9 text-xs bg-white"
        />
      </Box>

      {/* ── Course Grid ── */}
      <Box className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((course) => (
          <Card key={course.name} className="p-0 overflow-hidden">
            {/* Banner */}
            <Box className={`relative h-28 `}>
              <Badge className={`absolute top-2 right-2 text-[10px] text-white border-0 ${course.tierBg}`}>
                {course.tier}
              </Badge>
            </Box>

            {/* Info */}
            <Box className="p-3.5">
              <Text as="p" className="text-sm font-semibold">{course.name}</Text>
              <Box className="flex items-center gap-1.5 mt-1">
                <Text as="span" className="text-[11px] text-muted-foreground">
                  {course.hours} · {course.modules} ·
                </Text>
                <StarRating filled={course.stars} />
                <Text as="span" className="text-[11px] text-muted-foreground">
                  {course.rating}
                </Text>
              </Box>
            </Box>

            {/* Footer */}
            <Box className="flex items-center justify-between px-3.5 py-2.5 border-t">
              <Text as="span" className="font-bold text-sm text-navy">
                {course.price}
              </Text>
              <Button size="sm" className="text-xs h-7 px-3 bg-navy hover:bg-navy-soft text-paper">
                Enroll Now
              </Button>
            </Box>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
