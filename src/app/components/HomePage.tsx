import Header from "./Header";
import CategorySidebar from "./CategorySidebar";
import CarouselSection from "./CarouselSection";
import ProductGrid from "./ProductGrid";
import Footer from "./Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* FULL WIDTH HERO */}
      <CarouselSection />

      {/* PAGE CONTENT */}
      <div className="container mx-auto px-4 sm:px-6 py-6">
        {/* Categories */}
        <CategorySidebar />

        {/* Featured / Products */}
        <div className="mt-8">
          <ProductGrid />
        </div>
      </div>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}
