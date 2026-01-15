import Header from './Header';
import CategorySidebar from './CategorySidebar';
import CarouselSection from './CarouselSection';
import ProductGrid from './ProductGrid';
import Footer from './Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Category Sidebar + Carousel */}
        <div className="flex gap-6 mb-8">
          {/* Category Sidebar - 1/3 */}
          <div className="w-1/3">
            <CategorySidebar />
          </div>
          
          {/* Carousel - 2/3 */}
          <div className="w-2/3">
            <CarouselSection />
          </div>
        </div>

        {/* Featured Products */}
        <ProductGrid />
      </div>

      <Footer />
    </div>
  );
}