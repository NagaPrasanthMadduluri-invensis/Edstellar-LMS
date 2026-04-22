import { Card } from "@/components/ui/card";
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
    tierBg: "bg-gradient-to-r from-amber-400 to-amber-600",
    gradient: "from-indigo-400/60 to-purple-500/60",
  },
  {
    name: "ITIL 4 Foundation",
    hours: "24 hrs",
    modules: "6 modules",
    rating: 4.6,
    stars: 4,
    price: "₹34,999",
    tier: "Silver",
    tierBg: "bg-gradient-to-r from-gray-400 to-gray-600",
    gradient: "from-emerald-400/60 to-teal-500/60",
  },
  {
    name: "Scrum Master (CSM)",
    hours: "20 hrs",
    modules: "5 modules",
    rating: 4.5,
    stars: 4,
    price: "₹19,999",
    tier: "Bronze",
    tierBg: "bg-gradient-to-r from-orange-300 to-orange-500",
    gradient: "from-orange-400/60 to-red-500/60",
  },
  {
    name: "Six Sigma Green Belt",
    hours: "30 hrs",
    modules: "7 modules",
    rating: 4.7,
    stars: 5,
    price: "₹39,999",
    tier: "Gold",
    tierBg: "bg-gradient-to-r from-amber-400 to-amber-600",
    gradient: "from-cyan-400/60 to-blue-500/60",
  },
  {
    name: "PRINCE2 Foundation",
    hours: "22 hrs",
    modules: "6 modules",
    rating: 4.4,
    stars: 4,
    price: "₹29,999",
    tier: "Silver",
    tierBg: "bg-gradient-to-r from-gray-400 to-gray-600",
    gradient: "from-pink-400/60 to-rose-500/60",
  },
  {
    name: "PMI-ACP Certification",
    hours: "28 hrs",
    modules: "7 modules",
    rating: 4.6,
    stars: 4,
    price: "₹44,999",
    tier: "Gold",
    tierBg: "bg-gradient-to-r from-amber-400 to-amber-600",
    gradient: "from-violet-400/60 to-purple-600/60",
  },
];

function StarRating({ filled, total = 5 }) {
  return (
    <Box className="inline-flex gap-0.5">
      {Array.from({ length: total }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < filled ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`}
        />
      ))}
    </Box>
  );
}

export default function CourseCatalogPage() {
  return (
    <Box className="space-y-5">
      {/* ── Page Header ── */}
      <Box>
        <Text as="h1" className="text-2xl">Course Catalog</Text>
        <Text as="p" className="text-muted-foreground text-xs mt-0.5">
          Home &gt; <Text as="span" className="text-indigo-500">Course Catalog</Text>
        </Text>
      </Box>

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
            <Box className={`relative h-28 bg-gradient-to-br ${course.gradient}`}>
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
              <Text as="span" className="font-bold text-sm text-indigo-500">
                {course.price}
              </Text>
              <Button size="sm" className="text-xs h-7 px-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
                Enroll Now
              </Button>
            </Box>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
