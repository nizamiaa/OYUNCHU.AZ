import { Facebook, Twitter, Instagram, Youtube, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-blue-900 text-white mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="font-bold text-xl mb-4">Oyunchu.az</h3>
            <p className="text-blue-200 text-sm">
              Your ultimate destination for gaming consoles, controllers, and accessories.
            </p>
            <div className="flex gap-3 mt-4">
              <button className="p-2 bg-blue-800 rounded-full hover:bg-orange-500 transition">
                <Facebook size={20} />
              </button>
              <button className="p-2 bg-blue-800 rounded-full hover:bg-orange-500 transition">
                <Twitter size={20} />
              </button>
              <button className="p-2 bg-blue-800 rounded-full hover:bg-orange-500 transition">
                <Instagram size={20} />
              </button>
              <button className="p-2 bg-blue-800 rounded-full hover:bg-orange-500 transition">
                <Youtube size={20} />
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2 text-blue-200 text-sm">
              <li><a href="#" className="hover:text-orange-400 transition">About Us</a></li>
              <li><a href="#" className="hover:text-orange-400 transition">Contact</a></li>
              <li><a href="#" className="hover:text-orange-400 transition">FAQ</a></li>
              <li><a href="#" className="hover:text-orange-400 transition">Shipping Info</a></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-bold text-lg mb-4">Categories</h3>
            <ul className="space-y-2 text-blue-200 text-sm">
              <li><a href="#" className="hover:text-orange-400 transition">PlayStation 5</a></li>
              <li><a href="#" className="hover:text-orange-400 transition">Xbox Series X/S</a></li>
              <li><a href="#" className="hover:text-orange-400 transition">Nintendo Switch</a></li>
              <li><a href="#" className="hover:text-orange-400 transition">Accessories</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-bold text-lg mb-4">Newsletter</h3>
            <p className="text-blue-200 text-sm mb-3">Subscribe for exclusive deals!</p>
          </div>
        </div>

        <div className="border-t border-blue-800 mt-8 pt-6 text-center text-blue-300 text-sm">
          <p>© 2026 Oyunchu. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
