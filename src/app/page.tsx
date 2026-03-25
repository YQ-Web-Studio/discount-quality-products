import { getProducts, Product } from "@/lib/wordpress";
import ProductCard from "@/components/ProductCard";
import { ShoppingBag } from "lucide-react";

export default async function Home() {
  let products: Product[] = [];
  let error = null;

  try {
    const response = await getProducts(12);
    products = response.products;
  } catch (e: any) {
    console.error("Home Page Fetch Error:", e);
    error = e.message;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-zinc-900" />
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">
              Discount Store
            </h1>
          </div>
          <nav className="hidden space-x-8 md:flex">
            <a href="/" className="text-sm font-medium text-zinc-900">Products</a>
            <a href="#" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">Categories</a>
            <a href="#" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">Deals</a>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="flex flex-col gap-4 mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900">
            Featured Products
          </h2>
          <p className="max-w-2xl text-lg text-zinc-600">
            Browse our latest selection of high-quality products at discounted prices.
          </p>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <h3 className="text-lg font-semibold text-red-800">Connection Error</h3>
            <p className="mt-2 text-red-700">
              {error}. Please ensure the WordPress backend is running at http://discount-products-backend.local.
            </p>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200">
            <p className="text-lg font-medium text-zinc-600">
              No products found in the catalog.
            </p>
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-zinc-200 py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-zinc-500">
            &copy; {new Date().getFullYear()} Discount Products Store. Built with Next.js & WooCommerce.
          </p>
        </div>
      </footer>
    </div>
  );
}
